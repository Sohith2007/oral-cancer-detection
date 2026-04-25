import io
from pathlib import Path

import torch
import torch.nn as nn
from PIL import Image
from torchvision import models, transforms


MODEL_DIR = Path(__file__).resolve().parent.parent / "models"


class VisionExpertService(nn.Module):
    def __init__(self, checkpoint_name: str):
        super().__init__()
        self.checkpoint_path = MODEL_DIR / checkpoint_name
        self.model = None
        self.transform = transforms.Compose(
            [
                transforms.Resize((224, 224)),
                transforms.ToTensor(),
                transforms.Normalize(
                    mean=[0.485, 0.456, 0.406],
                    std=[0.229, 0.224, 0.225],
                ),
            ]
        )
        self._load_checkpoint_if_available()

    def _load_checkpoint_if_available(self):
        if not self.checkpoint_path.exists():
            return

        backbone = models.resnet18(weights=models.ResNet18_Weights.DEFAULT)
        num_features = backbone.fc.in_features
        backbone.fc = nn.Sequential(nn.Linear(num_features, 1), nn.Sigmoid())

        checkpoint = torch.load(self.checkpoint_path, map_location="cpu")
        state_dict = checkpoint.get("state_dict", checkpoint) if isinstance(checkpoint, dict) else checkpoint
        backbone.load_state_dict(state_dict)
        backbone.eval()
        self.model = backbone

    def forward(self, image_bytes):
        try:
            if not image_bytes or self.model is None:
                # Return a neutral probability rather than a fabricated medical score
                # when no trained checkpoint is available.
                return 0.5

            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            tensor = self.transform(image).unsqueeze(0)
            with torch.no_grad():
                probability = self.model(tensor)
            return probability.item()
        except Exception as exc:
            print(f"[Vision Error] Failed to process image: {exc}")
            return 0.5


intra_oral_vision_model = VisionExpertService("intra_oral_expert.pt")
histopathology_vision_model = VisionExpertService("histopathology_expert.pt")
