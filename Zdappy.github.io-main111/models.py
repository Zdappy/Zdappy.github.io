from __future__ import annotations
from datetime import datetime
from flask_login import UserMixin
from werkzeug.security import check_password_hash, generate_password_hash
from extensions import db

favorites = db.Table('favorites',
    db.Column('user_id', db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
    db.Column('product_id', db.Integer, db.ForeignKey('products.id', ondelete='CASCADE'), primary_key=True)
)
class User(UserMixin, db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    is_admin = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    surname = db.Column(db.String(80), nullable=True)
    name = db.Column(db.String(80), nullable=True)
    patronymic = db.Column(db.String(80), nullable=True)

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    favorite_products = db.relationship(
        'Product',
        secondary=favorites,
        backref=db.backref('favorited_by', lazy='dynamic'),
        lazy='dynamic')

class Category(db.Model):
    __tablename__ = "categories"
    id = db.Column(db.Integer, primary_key=True)
    slug = db.Column(db.String(64), unique=True, nullable=False, index=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    products = db.relationship("Product", back_populates="category", cascade="all, delete-orphan", lazy="selectin")

class Product(db.Model):
    __tablename__ = "products"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False, index=True)
    description = db.Column(db.Text, nullable=False)
    price = db.Column(db.Float, nullable=False)
    image_url = db.Column(db.String(255), nullable=True)
    category_id = db.Column(db.Integer, db.ForeignKey("categories.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    category = db.relationship("Category", back_populates="products", lazy="selectin")
    extra_images = db.relationship('ProductImage',
                                   backref='product',
                                   lazy='dynamic',
                                   cascade='all, delete-orphan',
                                   order_by='ProductImage.order')

    def _resolve_image_url(self) -> str:
        if not self.image_url or not self.image_url.strip():
            return "/static/images/icon.png"
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
        img = self._resolve_image_url()
        return {
            "id": self.id, "name": self.name, "title": self.name,
            "description": self.description, "price_value": float(self.price),
            "price_text": f"{self.price:.0f} ₽", "image": img, "image_url": img,
            "category": self.category.slug if self.category else None,
            "category_name": self.category.name if self.category else None,
        }


class ProductImage(db.Model):
    __tablename__ = 'product_images'

    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id', ondelete='CASCADE'), nullable=False)
    url = db.Column(db.String(300), nullable=False) 
    order = db.Column(db.Integer, default=0)  
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Order(db.Model):
    __tablename__ = 'orders'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    user_order_number = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    total_price = db.Column(db.Float, nullable=False)
    items = db.relationship('OrderItem', backref='order', cascade='all, delete-orphan')

class OrderItem(db.Model):
    __tablename__ = 'order_items'
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False)
    product_name = db.Column(db.String(200), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    price = db.Column(db.Float, nullable=False)
    
class Post(db.Model):
    __tablename__ = 'post'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False) 
    content = db.Column(db.Text, nullable=False)      
    date_posted = db.Column(db.DateTime, default=datetime.now)
    image_post = db.Column(db.String(255))           
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=True)
    related_product = db.relationship('Product', backref='posts')