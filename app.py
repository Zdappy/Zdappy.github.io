from __future__ import annotations
import os
import logging
from flask import Flask
from extensions import csrf, db, login_manager
from models import Category, Product, User
from routes import bp

BRAND_NAME = "Новая Эра"
logging.basicConfig(level=logging.INFO)

def _ensure_categories() -> None:
    if Category.query.first():
        return
    
    cats = [
        Category(slug="semenaO", name="Семена овощей"),
        Category(slug="cvety", name="Цветы"),
        Category(slug="ovoshi", name="Овощи"),
        Category(slug="posadochny_material", name="Посадочный материал"),
    ]
    for cat in cats:
        db.session.add(cat)
    db.session.commit()

def _create_admin_user() -> None:
    admin = User.query.filter_by(username="admin").first()
    if admin:
        if not admin.is_admin:
            admin.is_admin = True
            db.session.commit()
        return
    
    admin = User(
        username="admin", 
        email="admin@example.com", 
        is_admin=True, 
        surname="Админ", 
        name="Системы", 
        patronymic=""
    )
    admin.set_password("123")
    db.session.add(admin)
    db.session.commit()

def create_app() -> Flask:
    app = Flask(__name__, instance_relative_config=True)
    
    app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev-secret-key-change-in-prod")
    app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL", "sqlite:///shop.db")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["BRAND_NAME"] = BRAND_NAME
    
    os.makedirs(app.instance_path, exist_ok=True)

    db.init_app(app)
    login_manager.init_app(app)
    csrf.init_app(app)
    
    login_manager.login_view = "main.login"
    login_manager.login_message = "Сначала войдите в аккаунт."

    app.register_blueprint(bp)

    @app.context_processor
    def inject_globals():
        return {"brand_name": app.config["BRAND_NAME"]}
    
    with app.app_context():
        db.create_all()
        _ensure_categories()
        _create_admin_user()

    return app

app = create_app()

if __name__ == "__main__":
    app.run(debug=True)