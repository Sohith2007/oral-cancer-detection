import torch
import torch.nn as nn
import torch.nn.functional as F


class ModalityEncoder(nn.Module):
    """
    Per-modality encoder: projects a raw 128D embedding into a normalized
    hidden representation with its own LayerNorm for training stability.
    """
    def __init__(self, input_dim: int, hidden_dim: int):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.LayerNorm(hidden_dim),
            nn.GELU(),
            nn.Dropout(0.1),
        )

    def forward(self, x):
        return self.net(x)


class AdvancedDeepFusion(nn.Module):
    """
    Multimodal Transformer Fusion Model with:
    - Per-modality encoders (heterogeneous alignment)
    - Multi-Head Self-Attention across modalities (cross-modal reasoning)
    - Reliability Weighting via key_padding_mask (missing modality robustness)
    - CLS token aggregation (standard Transformer pooling strategy)
    - Dual output heads: Binary Diagnosis + Cancer Stage
    """

    def __init__(self, num_modalities: int = 4, embedding_dim: int = 128,
                 hidden_dim: int = 64, num_heads: int = 4):
        super().__init__()
        self.num_modalities = num_modalities
        self.embedding_dim = embedding_dim
        self.hidden_dim = hidden_dim

        # ── 1. Per-modality Encoders ───────────────────────────────────────────
        self.modality_encoders = nn.ModuleList([
            ModalityEncoder(embedding_dim, hidden_dim)
            for _ in range(num_modalities)
        ])

        # ── 2. Learnable CLS token (aggregates global context across modalities)
        self.cls_token = nn.Parameter(torch.randn(1, 1, hidden_dim) * 0.02)

        # ── 3. Transformer Encoder Layer ───────────────────────────────────────
        # Uses multi-head self-attention so every modality attends to every other
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=hidden_dim,
            nhead=num_heads,
            dim_feedforward=hidden_dim * 4,
            dropout=0.1,
            activation='gelu',
            batch_first=True,
            norm_first=True,   # Pre-LN for more stable gradients
        )
        self.transformer = nn.TransformerEncoder(encoder_layer, num_layers=2,
                                                  enable_nested_tensor=False)

        # ── 4. Reliability-aware attention pooling ────────────────────────────
        # A separate single-head attention layer that explicitly assigns
        # per-modality reliability weights used for XAI display
        self.reliability_attn = nn.MultiheadAttention(
            embed_dim=hidden_dim,
            num_heads=1,
            batch_first=True,
        )

        # ── 5. Classification Heads ────────────────────────────────────────────
        self.classifier = nn.Sequential(
            nn.Linear(hidden_dim, 64),
            nn.GELU(),
            nn.Dropout(0.2),
        )

        # Head 1: Binary Diagnosis (Cancer probability 0–1)
        self.diagnosis_head = nn.Linear(64, 1)

        # Head 2: Cancer Stage (4 classes: I, II, III, IV)
        self.stage_head = nn.Linear(64, 4)

    def forward(self, x_list, padding_mask=None):
        """
        Args:
            x_list: list of (batch, embedding_dim) tensors, one per modality.
                     Missing modalities should still be provided as zero tensors;
                     the padding_mask signals which to ignore.
            padding_mask: (batch, num_modalities) bool tensor.
                          True = that modality is MISSING → attention ignores it.

        Returns:
            diagnosis_logit: (batch, 1) raw logit (apply sigmoid for probability)
            stage_logits:    (batch, 4) raw logits for stage classification
            modality_weights: (num_modalities,) float tensor of per-modality
                               attention weights (sums to 1, for XAI display)
        """
        batch_size = x_list[0].size(0)

        # ── Encode each modality ───────────────────────────────────────────────
        encoded = []
        for i, enc in enumerate(self.modality_encoders):
            h = enc(x_list[i])          # (batch, hidden_dim)
            encoded.append(h.unsqueeze(1))  # (batch, 1, hidden_dim)

        # ── Prepend CLS token ──────────────────────────────────────────────────
        cls = self.cls_token.expand(batch_size, -1, -1)  # (batch, 1, hidden_dim)
        x = torch.cat([cls] + encoded, dim=1)            # (batch, 1+num_mod, hidden_dim)

        # Extend the padding mask to include the CLS position (always visible)
        if padding_mask is not None:
            cls_mask = torch.zeros(batch_size, 1, dtype=torch.bool, device=padding_mask.device)
            full_mask = torch.cat([cls_mask, padding_mask], dim=1)  # (batch, 1+num_mod)
        else:
            full_mask = None

        # ── Transformer (cross-modal self-attention) ───────────────────────────
        x = self.transformer(x, src_key_padding_mask=full_mask)

        # ── CLS token pooling ──────────────────────────────────────────────────
        # The CLS token at position 0 has aggregated information from all modalities
        cls_out = x[:, 0, :]  # (batch, hidden_dim)

        # ── Reliability weights via attention over modality tokens ─────────────
        # Query = CLS token, Keys/Values = modality tokens only (positions 1..N)
        modality_tokens = x[:, 1:, :]  # (batch, num_mod, hidden_dim)
        _, raw_weights = self.reliability_attn(
            cls_out.unsqueeze(1),   # query: (batch, 1, hidden_dim)
            modality_tokens,         # key
            modality_tokens,         # value
            key_padding_mask=padding_mask,
        )
        # raw_weights: (batch, 1, num_mod) → squeeze to (num_mod,) per-sample mean
        modality_weights = raw_weights.squeeze(1).mean(dim=0)  # (num_mod,)

        # ── Classification ─────────────────────────────────────────────────────
        features = self.classifier(cls_out)
        diagnosis_logit = self.diagnosis_head(features)   # (batch, 1)
        stage_logits = self.stage_head(features)           # (batch, 4)

        return diagnosis_logit, stage_logits, modality_weights
