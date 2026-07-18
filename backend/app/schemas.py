from pydantic import BaseModel, Field
from typing import Optional, List
from decimal import Decimal
from datetime import datetime

# ==========================================
# 1. SCHÉMAS POUR LES UTILISATEURS (AGENTS)
# ==========================================

class UtilisateurLogin(BaseModel):
    telephone: str
    mot_de_passe: str

class UtilisateurCreate(BaseModel):
    nom: str
    telephone: str
    mot_de_passe: str
    role: Optional[str] = "agent"

class UtilisateurResponse(BaseModel):
    id: int
    nom: str
    telephone: str
    role: str
    actif: bool
    cree_le: datetime

    class Config:
        from_attributes = True


# ==========================================
# 2. SCHÉMAS POUR LES ÉVÉNEMENTS
# ==========================================

class EvenementCreate(BaseModel):
    titre: str = Field(..., max_length=150)
    type_soiree: str = Field(..., max_length=100)
    date_evenement: datetime
    lieu_nom: str = Field(..., max_length=150)
    adresse: str = Field(..., max_length=255)
    commune_ville: Optional[str] = Field(None, max_length=100)

class EvenementResponse(BaseModel):
    id: int
    titre: str
    type_soiree: str
    date_evenement: datetime
    lieu_nom: str
    adresse: str
    commune_ville: Optional[str]
    cree_le: datetime

    class Config:
        from_attributes = True


# ==========================================
# 3. SCHÉMAS POUR LES AVANTAGES
# ==========================================

class AvantageBilletCreate(BaseModel):
    description_avantage: str = Field(..., max_length=255)
    est_optionnel: bool = False

class AvantageBilletResponse(BaseModel):
    id: int
    billet_id: int
    description_avantage: str
    est_optionnel: bool
    cree_le: datetime

    class Config:
        from_attributes = True


# ==========================================
# 4. SCHÉMAS POUR LES TYPES DE BILLETS
# ==========================================

class TypeBilletCreate(BaseModel):
    evenement_id: int
    nom_type: str = Field(..., max_length=50)
    prix: Decimal
    quantite_max: int
    taille_table: Optional[int] = 1

class TypeBilletResponse(BaseModel):
    id: int
    evenement_id: int
    nom_type: str
    prix: Decimal
    quantite_max: int
    taille_table: int
    cree_le: datetime
    # Permet d'inclure les avantages directement s'ils sont chargés
    avantages: Optional[List[AvantageBilletResponse]] = []

    class Config:
        from_attributes = True


# ==========================================
# 5. SCHÉMAS POUR LA VENTE DE BILLETS
# ==========================================

class VenteBilletSchema(BaseModel):
    nom_client: str = Field(..., min_length=2, description="Nom du client")
    prenom_client: Optional[str] = None
    telephone_client: str = Field(..., description="Numéro de téléphone du client")
    type_billet_id: int = Field(..., description="L'ID du type de billet")
    items: Optional[str] = Field(None, description="Articles ou options supplémentaires achetés par le client") # <-- AJOUT

# Représentation détaillée pour le reçu d'achat
class BilletAchatResponse(BaseModel):
    ticket_id: int
    code_unique: str
    statut_scan: str
    type_billet: str
    prix: Decimal
    taille_table: int
    nom_client: str
    telephone_client: str
    # Ajout d'infos de l'événement très utiles pour le billet final
    evenement_titre: str
    evenement_date: datetime
    evenement_lieu: str
    date_achat: datetime

    class Config:
        from_attributes = True


# ==========================================
# 6. SCHÉMAS POUR LE SCANNER (ANTI-FRAUDE)
# ==========================================

class ScanBilletSchema(BaseModel):
    code_unique: str

class ScanResultResponse(BaseModel):
    valide: bool
    message: str
    nom_client: Optional[str] = None
    type_billet: Optional[str] = None
    evenement_titre: Optional[str] = None
    date_scan: Optional[datetime] = None


# ==========================================
# 7. SCHÉMAS POUR LE SUIVI DES TICKETS (TRACKING)
# ==========================================

class TicketTrackingCreate(BaseModel):
    billet_id: Optional[int] = None
    action: str = Field(..., max_length=50, description="Ex: VENTE, SCAN_REUSSI, FRAUDE, ETC.")
    description: Optional[str] = None
    cree_par: Optional[int] = None

class TicketTrackingResponse(BaseModel):
    id: int
    billet_id: Optional[int]
    action: str
    description: Optional[str]
    cree_par: Optional[int]
    cree_le: datetime

    class Config:
        from_attributes = True


class AllocationStockCreate(BaseModel):
    agent_id: int
    categorie_billet_id: int
    quantite: int = Field(..., gt=0, description="La quantité doit être supérieure à 0")

class AllocationStockResponse(BaseModel):
    id: int
    agent_id: int
    categorie_billet_id: int
    quantite: int
    cree_le: datetime

    class Config:
        from_attributes = True
