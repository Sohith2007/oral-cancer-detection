import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np
import os
import sys

# Ensure Python can find the app module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.ml.layer2_fusion.advanced_fusion import AdvancedDeepFusion

def train_model():
    print("==================================================")
    print(" TRAINING ADVANCED DEEP FEATURE FUSION MODEL")
    print("==================================================")
    
    num_modalities = 4 # Histopathology, Intraoral, Clinical, Genomic
    embedding_dim = 128
    batch_size = 32
    num_epochs = 15
    
    model = AdvancedDeepFusion(num_modalities=num_modalities, embedding_dim=embedding_dim)
    
    # Loss functions for Multi-Head Output
    criterion_diagnosis = nn.BCELoss() # Binary Cross Entropy for Diagnosis
    criterion_risk = nn.CrossEntropyLoss() # Cross Entropy for Risk Stage (4 classes)
    
    optimizer = optim.Adam(model.parameters(), lr=0.001)
    
    print("[1] Generating Synthetic High-Dimensional Embedding Dataset...")
    print("    (Simulating output vectors from ResNet, LightGBM, etc. instead of late-fusion 1D scores)")
    num_samples = 1000
    
    print("[2] Starting Training Loop with Missing-Modality Dropout (15% missing rate)...")
    
    for epoch in range(num_epochs):
        model.train()
        epoch_loss = 0
        diag_loss_total = 0
        risk_loss_total = 0
        
        for i in range(0, num_samples, batch_size):
            # Generate random embeddings (Deep Feature Fusion)
            x_list = [torch.randn(batch_size, embedding_dim) for _ in range(num_modalities)]
            
            # Missing-Modality Robustness: Randomly mask out modalities (Dropout)
            padding_mask = torch.rand(batch_size, num_modalities) < 0.15
            # Ensure at least the primary modality (e.g. clinical) is always present to avoid NaN
            padding_mask[:, 0] = False
            
            # Dummy targets
            target_diagnosis = torch.randint(0, 2, (batch_size, 1)).float()
            target_risk = torch.randint(0, 4, (batch_size,))
            
            optimizer.zero_grad()
            
            diagnosis_prob, risk_stage_logits, attn_weights = model(x_list, padding_mask)
            
            loss_diag = criterion_diagnosis(diagnosis_prob, target_diagnosis)
            loss_risk = criterion_risk(risk_stage_logits, target_risk)
            
            # Combined Loss
            loss = loss_diag + loss_risk
            
            loss.backward()
            optimizer.step()
            
            epoch_loss += loss.item()
            diag_loss_total += loss_diag.item()
            risk_loss_total += loss_risk.item()
            
        avg_loss = epoch_loss / (num_samples/batch_size)
        avg_diag = diag_loss_total / (num_samples/batch_size)
        avg_risk = risk_loss_total / (num_samples/batch_size)
        
        if (epoch + 1) % 3 == 0 or epoch == 0:
            print(f"Epoch {epoch+1:02d}/{num_epochs} | Total Loss: {avg_loss:.4f} (Diag: {avg_diag:.4f}, Risk: {avg_risk:.4f})")
        
    print("\n Training Complete!")
    print("Implemented Fixes:")
    print("  - Deep Feature Fusion (Trained on 128-D vectors)")
    print("  - Missing-Modality Robustness (Trained with Attention key_padding_mask)")
    print("  - Risk Prediction vs Diagnosis (Trained with multi-head BCELoss & CrossEntropyLoss)")
    
    # Save the new advanced model
    os.makedirs("app/ml/models", exist_ok=True)
    save_path = "app/ml/models/advanced_fusion_model.pth"
    torch.save(model.state_dict(), save_path)
    print(f"\n Model successfully saved to: {save_path}")

if __name__ == "__main__":
    train_model()
