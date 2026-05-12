from __future__ import annotations
from datetime import datetime
from urllib.parse import urlparse
from flask_login import UserMixin
from werkzeug.security import check_password_hash, generate_password_hash

from extensions import db


class User(UserMixin, db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    is_admin = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def __repr__(self) -> str:
        return f"<User {self.username}>"


class Category(db.Model):
    __tablename__ = "categories"

    id = db.Column(db.Integer, primary_key=True)
    slug = db.Column(db.String(64), unique=True, nullable=False, index=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    products = db.relationship(
        "Product",
        back_populates="category",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<Category {self.slug}>"


class Product(db.Model):
    __tablename__ = "products"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False, index=True)
    description = db.Column(db.Text, nullable=False)
    price = db.Column(db.Float, nullable=False)
    image_url = db.Column(db.String(255), nullable=True)
    category_id = db.Column(db.Integer, db.ForeignKey("categories.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    category = db.relationship("Category", back_populates="products", lazy="joined")

    def _resolve_image_url(self) -> str:
        if not self.image_url:
            return ""
        value = self.image_url.strip().replace("\\", "/")
        if value.startswith(("http://", "https://", "/")):
            return value
        if value.startswith("static/"):
            return "/" + value
        return f"/static/{value.lstrip('/')}"

    @property
    def image_src(self) -> str:
        return self._resolve_image_url()

    def to_dict(self) -> dict:
        image_url = self._resolve_image_url()
        return {
            "id": self.id,
            "name": self.name,
            "title": self.name,
            "description": self.description,
            "price_value": float(self.price),
            "price_text": f"{self.price:.0f} ₽" if float(self.price).is_integer() else f"{self.price:.2f} ₽",
            "image": image_url,
            "image_url": image_url,
            "category": self.category.slug if self.category else None,
            "category_name": self.category.name if self.category else None,
        }

    def __repr__(self) -> str:
        return f"<Product {self.name}>"
