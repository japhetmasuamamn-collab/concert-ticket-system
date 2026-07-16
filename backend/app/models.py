from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Numeric, Text, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import pytz 
from .database import Base

tz_local = pytz.timezone("Africa/Lubumbashi")

def obtenir_heure_locale():
    return datetime.now(tz_local)

class Evenement(Base):
    __tablename__ = "evenements"

    id = Column(Integer, primary_key=True, index=True)
    titre = Column(String(150), nullable=False)
    type_soiree = Column(String(100), nullable=False)
    date_evenement = Column(DateTime, nullable=False)
    lieu_nom = Column(String(150), nullable=False)
    adresse = Column(String(255), nullable=False)
    commune_ville = Column(String(100), nullable=True)
    cree_le = Column(DateTime, server_default=func.now())

    # Relations
    types_billets = relationship("TypeBillet", back_populates="evenement", cascade="all, delete-orphan")


class Utilisateur(Base):
    __tablename__ = "utilisateurs"

    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String(100), nullable=False)
    # Suppression de unique=True ici car il n'est pas unique dans ton SQL, mais indexé pour les perfs
    telephone = Column(String(20), nullable=False, index=True)
    mot_de_passe = Column(String(255), nullable=False)
    role = Column(String(20), default="agent")  # 'agent' ou 'administrateur'
    actif = Column(Boolean, default=True)
    cree_le = Column(DateTime, server_default=func.now())

    # Relations
    billets_vendus = relationship("Billet", back_populates="agent")


class TypeBillet(Base):
    __tablename__ = "types_billets"

    id = Column(Integer, primary_key=True, index=True)
    evenement_id = Column(Integer, ForeignKey("evenements.id", ondelete="CASCADE"), nullable=False)
    nom_type = Column(String(50), nullable=False)  # Retrait du unique=True car plusieurs événements peuvent avoir un billet 'VIP'
    prix = Column(Numeric(10, 2), nullable=False)
    quantite_max = Column(Integer, nullable=False)
    taille_table = Column(Integer, default=1)
    cree_le = Column(DateTime, server_default=func.now())

    # Relations
    evenement = relationship("Evenement", back_populates="types_billets")
    billets = relationship("Billet", back_populates="type_billet")
    avantages = relationship("AvantageBillet", back_populates="type_billet", cascade="all, delete-orphan")


class AvantageBillet(Base):
    __tablename__ = "avantages_billets"

    id = Column(Integer, primary_key=True, index=True)
    billet_id = Column(Integer, ForeignKey("types_billets.id", ondelete="CASCADE"), nullable=False)
    description_avantage = Column(String(255), nullable=False)
    est_optionnel = Column(Boolean, default=False, nullable=False)
    cree_le = Column(DateTime, server_default=func.now())

    # Relations
    type_billet = relationship("TypeBillet", back_populates="avantages")


class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String(100), nullable=False)
    prenom = Column(String(100), nullable=True)
    telephone = Column(String(20), nullable=False, index=True)
    items = Column(Text, nullable=True) # <-- AJOUT : Détails ou articles liés au client
    cree_le = Column(DateTime, server_default=func.now())

    # Relations
    billets = relationship("Billet", back_populates="client")


# Dans models.py, modifie la ligne du modèle Billet :
class Billet(Base):
    __tablename__ = "billets"

    id = Column(Integer, primary_key=True, index=True)
    code_unique = Column(String(100), unique=True, nullable=False, index=True)
    statut_scan = Column(String(20), default="disponible")
    
    # On passe la fonction obtenir_heure_locale (sans les parenthèses) comme valeur par défaut
    date_achat = Column(DateTime, default=obtenir_heure_locale) 
    date_scan = Column(DateTime, nullable=True)

    # Clés Étrangères
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="SET NULL"), nullable=True)
    type_billet_id = Column(Integer, ForeignKey("types_billets.id", ondelete="RESTRICT"), nullable=True) # Modifié en nullable=True pour matcher ton SQL
    agent_id = Column(Integer, ForeignKey("utilisateurs.id", ondelete="SET NULL"), nullable=True)

    # Relations
    client = relationship("Client", back_populates="billets")
    type_billet = relationship("TypeBillet", back_populates="billets")
    agent = relationship("Utilisateur", back_populates="billets_vendus")


class TicketTracking(Base):
    __tablename__ = "tickets_tracking"

    id = Column(Integer, primary_key=True, index=True)
    billet_id = Column(Integer, ForeignKey("billets.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(50), nullable=False, index=True) # Ex: "VENTE", "SCAN_REUSSI", "ECHEC_FRAUDE"
    description = Column(Text, nullable=True)
    cree_par = Column(Integer, ForeignKey("utilisateurs.id", ondelete="SET NULL"), nullable=True)
    cree_le = Column(DateTime, default=obtenir_heure_locale)

    # Relations
    billet = relationship("Billet") # Permet de remonter facilement au billet concerné
    operateur = relationship("Utilisateur") # Permet d'avoir les détails de l'agent
