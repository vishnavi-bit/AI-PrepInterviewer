from __future__ import annotations

import re
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class RegisterIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(max_length=100)
    email: str = Field(max_length=254)
    password: str = Field(min_length=8, max_length=256)

    @field_validator("name")
    @classmethod
    def _name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Enter your name.")
        return value

    @field_validator("email")
    @classmethod
    def _email(cls, value: str) -> str:
        value = value.strip().lower()
        if not EMAIL_PATTERN.match(value):
            raise ValueError("Enter a valid email address.")
        return value


class LoginIn(BaseModel):
    # No format checks here: any bad input gets the same safe "incorrect" answer as a wrong password.
    model_config = ConfigDict(extra="forbid")

    email: str = Field(max_length=254)
    password: str = Field(max_length=256)


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    target_role: str | None
    avatar_url: str | None


def to_user_out(row: dict[str, Any]) -> UserOut:
    return UserOut(
        id=row["id"],
        name=row["name"],
        email=row["email"],
        target_role=row["target_role"],
        avatar_url="/api/profile/avatar" if row["avatar_path"] else None,
    )
