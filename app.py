"""Application entry point."""

from __future__ import annotations

import json
import os
import re
from pathlib import Path

from flask import Flask

from extensions import csrf, db, login_manager
from models import Category, Product, User
from routes import bp

BRAND_NAME = "NewEra"


def _parse_price(value) -> float:
    if value is None:
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    match = re.search(r"[\d.,]+", str(value))
    if not match:
        return 0.0
    return float(match.group(0).replace(",", "."))


def _seed_products(app: Flask) -> None:
    goods_dir = Path(app.root_path) / "static" / "goods"
    category_files = [
        ("semenaO", "Семена овощей", "semenaO.json"),
        ("cvety", "Цветы", "cvety.json"),
        ("ovoshi", "Овощи", "ovoshi.json"),
        ("posadochny_material", "Посадочный материал", "posadochny_material.json"),
    ]

    categories: dict[str, Category] = {}
    for slug, name, _ in category_files:
        category = Category.query.filter_by(slug=slug).first()
        if not category:
            category = Category(slug=slug, name=name)
            db.session.add(category)
            db.session.flush()
        categories[slug] = category

    db.session.commit()

    if Product.query.first():
        return

    for slug, _, filename in category_files:
        path = goods_dir / filename
        if not path.exists():
            continue
        with path.open(encoding="utf-8") as fh:
            items = json.load(fh)
        for item in items:
            product = Product(
                name=item.get("название") or "Без названия",
                description=item.get("описание") or "",
                price=_parse_price(item.get("цена")),
                image_url=item.get("изображение") or None,
                category_id=categories[slug].id,
            )
            db.session.add(product)
    db.session.commit()


def _create_admin_user() -> None:
    admin = User.query.filter_by(username="admin").first()
    if admin:
        if not admin.is_admin:
            admin.is_admin = True
            db.session.commit()
        return
    admin = User(username="admin", email="admin@example.com", is_admin=True)
    admin.set_password("123")
    db.session.add(admin)
    db.session.commit()


def create_app() -> Flask:
    app = Flask(__name__, instance_relative_config=True)
    app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev-secret-key")
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
        _seed_products(app)
        _create_admin_user()

    return app


app = create_app()


if __name__ == "__main__":
    app.run(debug=True)
