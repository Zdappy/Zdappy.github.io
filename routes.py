from __future__ import annotations
import logging
import re
from flask import Blueprint, abort, flash, jsonify, redirect, render_template, request, session, url_for
from flask_login import current_user, login_required, login_user, logout_user
from sqlalchemy import or_
from extensions import db, login_manager
from forms import LoginForm, ProductForm, RegistrationForm
from models import Category, Product, User

bp = Blueprint("main", __name__)
logger = logging.getLogger(__name__)


@login_manager.user_loader
def load_user(user_id: str):
    try:
        return db.session.get(User, int(user_id))
    except (TypeError, ValueError):
        return None


def _admin_only() -> None:
    if not current_user.is_authenticated or not current_user.is_admin:
        abort(403)


def _parse_price(value) -> float:
    if value is None:
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    match = re.search(r"[\d.,]+", str(value))
    if not match:
        return 0.0
    return float(match.group(0).replace(",", "."))


def _product_query():
    query = Product.query
    category_slug = (request.args.get("category") or "").strip()
    search = (request.args.get("search") or "").strip()

    if category_slug and category_slug not in {"all", "any"}:
        query = query.join(Category).filter(Category.slug == category_slug)
    if search:
        like = f"%{search}%"
        query = query.filter(or_(Product.name.ilike(like), Product.description.ilike(like)))
    return query.order_by(Product.id.desc())


def _flash_form_errors(form) -> None:
    for field, errors in form.errors.items():
        for error in errors:
            label = getattr(form, field).label.text if hasattr(form, field) else field
            flash(f"{label}: {error}", "error")


def _product_payload(product: Product) -> dict:
    return product.to_dict()


@bp.route("/")
def index():
    categories = Category.query.order_by(Category.name).all()
    products = _product_query().all()
    return render_template("index.html", categories=categories, products=products)


@bp.route("/auth/login", methods=["GET", "POST"])
def login():
    if current_user.is_authenticated:
        return redirect(url_for("main.index"))
    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(username=form.username.data).first()
        if user and user.check_password(form.password.data):
            login_user(user)
            return redirect(url_for("main.index"))
        flash("Неверный логин или пароль.", "error")
    elif request.method == "POST":
        _flash_form_errors(form)
    return render_template("login.html", form=form)


@bp.route("/auth/register", methods=["GET", "POST"])
def register():
    if current_user.is_authenticated:
        return redirect(url_for("main.index"))
    form = RegistrationForm()
    if form.validate_on_submit():
        user = User(username=form.username.data.strip(), email=form.email.data.strip())
        user.set_password(form.password.data)
        db.session.add(user)
        db.session.commit()
        flash("Регистрация прошла успешно. Теперь войдите.", "success")
        return redirect(url_for("main.login"))
    elif request.method == "POST":
        _flash_form_errors(form)
    return render_template("register.html", form=form)


@bp.route("/auth/logout")
@login_required
def logout():
    logout_user()
    flash("Вы вышли из аккаунта.", "info")
    return redirect(url_for("main.index"))


@bp.route("/basket")
def basket():
    return render_template("basket.html")


@bp.route("/admin")
@login_required
def admin():
    _admin_only()
    products = Product.query.order_by(Product.id.desc()).all()
    return render_template("admin.html", products=products)


@bp.route("/admin/add", methods=["GET", "POST"])
@login_required
def add_product():
    _admin_only()
    form = ProductForm()
    if not form.category.choices:
        flash("Сначала добавьте категории.", "error")
    if form.validate_on_submit():
        product = Product(
            name=form.name.data.strip(),
            description=form.description.data.strip(),
            price=float(form.price.data),
            image_url=form.image_url.data.strip() or None,
            category_id=form.category.data,
        )
        db.session.add(product)
        db.session.commit()
        flash("Товар добавлен.", "success")
        return redirect(url_for("main.admin"))
    elif request.method == "POST":
        _flash_form_errors(form)
        flash("Не удалось добавить товар. Проверьте поля формы.", "error")
    return render_template("admin_form.html", form=form, title="Добавить товар")


@bp.route("/admin/edit/<int:product_id>", methods=["GET", "POST"])
@login_required
def edit_product(product_id: int):
    _admin_only()
    product = db.session.get(Product, product_id)
    if not product:
        abort(404)
    form = ProductForm(obj=product)
    form.category.data = product.category_id
    if form.validate_on_submit():
        product.name = form.name.data.strip()
        product.description = form.description.data.strip()
        product.price = float(form.price.data)
        product.image_url = form.image_url.data.strip() or None
        product.category_id = form.category.data
        db.session.commit()
        flash("Товар обновлен.", "success")
        return redirect(url_for("main.admin"))
    elif request.method == "POST":
        _flash_form_errors(form)
        flash("Не удалось сохранить изменения.", "error")
    return render_template("admin_form.html", form=form, title="Редактировать товар")


@bp.route("/admin/delete/<int:product_id>", methods=["POST"])
@login_required
def delete_product(product_id: int):
    _admin_only()
    product = db.session.get(Product, product_id)
    if not product:
        abort(404)
    db.session.delete(product)
    db.session.commit()
    flash("Товар удален.", "warning")
    return redirect(url_for("main.admin"))


@bp.route("/api/products", methods=["GET"])
def api_products():
    products = [_product_payload(p) for p in _product_query().all()]
    return jsonify(products), 200


@bp.route("/api/products/<int:product_id>", methods=["GET", "PUT", "DELETE"])
def api_product_detail(product_id: int):
    product = db.session.get(Product, product_id)
    if not product:
        return jsonify({"error": "Товар не найден"}), 404

    if request.method == "GET":
        return jsonify(_product_payload(product)), 200

    if not current_user.is_authenticated or not current_user.is_admin:
        return jsonify({"error": "Недостаточно прав"}), 403

    if request.method == "DELETE":
        db.session.delete(product)
        db.session.commit()
        return jsonify({"message": "Товар удален"}), 200

    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"error": "Нужен JSON в теле запроса"}), 400

    if "name" in data and not str(data["name"]).strip():
        return jsonify({"error": "name не может быть пустым"}), 400
    if "description" in data and not str(data["description"]).strip():
        return jsonify({"error": "description не может быть пустым"}), 400
    if "price" in data:
        try:
            data["price"] = _parse_price(data["price"])
        except Exception:
            return jsonify({"error": "price должен быть числом"}), 400

    if "name" in data:
        product.name = str(data["name"]).strip()
    if "description" in data:
        product.description = str(data["description"]).strip()
    if "price" in data:
        product.price = float(data["price"])
    if "image_url" in data:
        product.image_url = str(data["image_url"]).strip() or None
    if "category_id" in data:
        try:
            category_id = int(data["category_id"])
        except (TypeError, ValueError):
            return jsonify({"error": "category_id должен быть числом"}), 400
        category = db.session.get(Category, category_id)
        if not category:
            return jsonify({"error": "category_id не найден"}), 404
        product.category_id = category.id

    db.session.commit()
    return jsonify({"message": "Товар обновлен", "product": _product_payload(product)}), 200


@bp.route("/api/products", methods=["POST"])
def api_products_create():
    if not current_user.is_authenticated or not current_user.is_admin:
        return jsonify({"error": "Недостаточно прав"}), 403

    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"error": "Нужен JSON в теле запроса"}), 400

    required = ["name", "description", "price", "category_id"]
    missing = [field for field in required if field not in data]
    if missing:
        return jsonify({"error": f"Не хватает полей: {', '.join(missing)}"}), 400

    try:
        category_id = int(data["category_id"])
    except (TypeError, ValueError):
        return jsonify({"error": "category_id должен быть числом"}), 400

    category = db.session.get(Category, category_id)
    if not category:
        return jsonify({"error": "category_id не найден"}), 404

    name = str(data["name"]).strip()
    description = str(data["description"]).strip()
    if not name or not description:
        return jsonify({"error": "name и description обязательны"}), 400

    product = Product(
        name=name,
        description=description,
        price=_parse_price(data["price"]),
        image_url=str(data.get("image_url") or "").strip() or None,
        category_id=category.id,
    )

    db.session.add(product)
    db.session.commit()
    return jsonify({"message": "Товар создан", "product": _product_payload(product)}), 201


@bp.route("/api/categories", methods=["GET"])
def api_categories():
    categories = [
        {"id": c.id, "slug": c.slug, "name": c.name, "count": len(c.products)}
        for c in Category.query.order_by(Category.name).all()
    ]
    return jsonify(categories), 200


@bp.route("/api/cart", methods=["GET", "POST"])
def api_cart():
    cart = session.get("cart", {})
    if request.method == "GET":
        return jsonify(cart), 200
    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"error": "Нужен JSON в теле запроса"}), 400
    product_id = str(data.get("product_id") or "").strip()
    if not product_id:
        return jsonify({"error": "product_id обязателен"}), 400
    try:
        quantity = int(data.get("quantity", 1))
    except (TypeError, ValueError):
        return jsonify({"error": "quantity должен быть числом"}), 400
    if quantity < 1:
        return jsonify({"error": "quantity должно быть >= 1"}), 400
    cart[product_id] = quantity
    session["cart"] = cart
    session.modified = True
    return jsonify({"message": "Корзина обновлена", "cart": cart}), 201


@bp.app_errorhandler(403)
def forbidden(error):
    return render_template("errors/403.html"), 403


@bp.app_errorhandler(404)
def not_found(error):
    return render_template("errors/404.html"), 404


@bp.app_errorhandler(500)
def server_error(error):
    db.session.rollback()
    logger.exception("Internal server error")
    return render_template("errors/500.html"), 500
