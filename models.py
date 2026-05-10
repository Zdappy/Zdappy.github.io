from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class Category(db.Model):
    __tablename__ = 'category'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100),nullable=False,unique=True)
    def __repr__(self):
        return f'<Category {self.name}>'


class Product(db.Model):
    __tablename__ = 'product'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200),nullable=False)
    description = db.Column(db.Text,nullable=False)
    price = db.Column(db.Float,nullable=False)
    image_url = db.Column(db.String(500),nullable=True)
    category_id = db.Column(db.Integer,db.ForeignKey('category.id'),nullable=False)
    category = db.relationship('Category',backref=db.backref('products', lazy=True))

    def __repr__(self):
        return f'<Product {self.name}>'