from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field


class ContractCreate(BaseModel):
    chain_address: str = Field(pattern=r"^C[A-Z2-7]{55}$")
    client_address: str = Field(pattern=r"^G[A-Z2-7]{55}$")
    freelancer_address: str = Field(pattern=r"^G[A-Z2-7]{55}$")
    token_address: str = Field(pattern=r"^C[A-Z2-7]{55}$")
    title: str = Field(min_length=1, max_length=180)
    network: str = Field(pattern=r"^testnet$")
    transaction_hash: str = Field(pattern=r"^[a-fA-F0-9]{64}$")
    milestones: list["MilestoneCreate"] = Field(min_length=1, max_length=50)


class MilestoneCreate(BaseModel):
    chain_milestone_id: int = Field(ge=0)
    description: str = Field(min_length=1, max_length=12000)
    amount: Decimal = Field(gt=0, max_digits=18, decimal_places=7)


class MilestoneRead(BaseModel):
    id: str
    chain_milestone_id: int
    description: str
    amount: Decimal
    status: str
    model_config = {"from_attributes": True}


class ContractRead(BaseModel):
    id: str
    chain_address: str
    title: str
    client_address: str
    freelancer_address: str
    token_address: str
    network: str
    status: str
    model_config = {"from_attributes": True}


class ContractDetailRead(ContractRead):
    milestones: list[MilestoneRead]


class ContractEventRead(BaseModel):
    id: str
    contract_address: str
    transaction_hash: str
    event_type: str
    observed_at: datetime
    model_config = {"from_attributes": True}
