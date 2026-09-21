from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.user import Role


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: EmailStr
    role: Role
    is_active: bool
    created_at: datetime
    updated_at: datetime


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    role: Role = Role.OPERATOR
    password: str = Field(min_length=6)

    @field_validator("name")
    @classmethod
    def name_min_length(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 2:
            raise ValueError("Nome muito curto")
        return value


class UserListItem(UserOut):
    pass
