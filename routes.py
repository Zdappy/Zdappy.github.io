from __future__ import annotations
import logging
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
    try: return db.session.get(User, int(user_id))
    except: return None

def _admin_only():
    if not current_user.is_authenticated or not current_user.is_admin:
        abort(403)

def _product_query():
    q = Product.query
    cat = (request.args.get("category") or "").strip()
    search = (request.args.get("search") or "").strip()
    if cat and cat != "all":
        q = q.join(Category).filter(Category.slug == cat)
    if search:
        like = f"%{search}%"
        q = q.filter(or_(Product.name.ilike(like), Product.description.ilike(like)))
    return q.order_by(Product.id.desc())

def _flash_errors(form):
    for field, errors in form.errors.items():
        for err in errors:
            flash(f"{getattr(form, field).label.text or field}: {err}", "error")

@bp.route("/")
def index():
    categories = Category.query.order_by(Category.name).all()
    products = _product_query().all()
    return render_template("index.html", categories=categories, products=products)

@bp.route("/auth/login", methods=["GET", "POST"])
def login():
    if current_user.is_authenticated: return redirect(url_for("main.index"))
    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(username=form.username.data).first()
        if user and user.check_password(form.password.data):
            login_user(user)
            return redirect(request.args.get("next") or url_for("main.index"))
        flash("Неверный логин или пароль.", "error")
    elif request.method == "POST": _flash_errors(form)
    return render_template("login.html", form=form)

@bp.route("/auth/register", methods=["GET", "POST"])
def register():
    if current_user.is_authenticated: return redirect(url_for("main.index"))
    form = RegistrationForm()
    if form.validate_on_submit():
        u = User(username=form.username.data.strip(), email=form.email.data.strip())
        u.set_password(form.password.data)
        db.session.add(u); db.session.commit()
        flash("Регистрация успешна. Войдите.", "success")
        return redirect(url_for("main.login"))
    elif request.method == "POST": _flash_errors(form)
    return render_template("register.html", form=form)

@bp.route("/auth/logout")
@login_required
def logout():
    logout_user(); flash("Вы вышли.", "info")
    return redirect(url_for("main.index"))

@bp.route("/basket")
def basket():
    return render_template("basket.html")

@bp.route("/admin")
@login_required
def admin():
    _admin_only()
    return render_template("admin.html", products=Product.query.order_by(Product.id.desc()).all())

@bp.route("/admin/add", methods=["GET", "POST"])
@login_required
def add_product():
    _admin_only()
    form = ProductForm()
    if form.validate_on_submit():
        db.session.add(Product(name=form.name.data.strip(), description=form.description.data.strip(),
                               price=float(form.price.data), image_url=form.image_url.data.strip() or None,
                               category_id=form.category.data))
        db.session.commit(); flash("Товар добавлен.", "success")
        return redirect(url_for("main.admin"))
    elif request.method == "POST": _flash_errors(form)
    return render_template("admin_form.html", form=form, title="Добавить товар")

@bp.route("/admin/edit/<int:product_id>", methods=["GET", "POST"])
@login_required
def edit_product(product_id: int):
    _admin_only()
    product = db.session.get(Product, product_id)
    if not product: abort(404)
    form = ProductForm(obj=product); form.category.data = product.category_id
    if form.validate_on_submit():
        product.name = form.name.data.strip(); product.description = form.description.data.strip()
        product.price = float(form.price.data); product.image_url = form.image_url.data.strip() or None
        product.category_id = form.category.data
        db.session.commit(); flash("Товар обновлён.", "success")
        return redirect(url_for("main.admin"))
    elif request.method == "POST": _flash_errors(form)
    return render_template("admin_form.html", form=form, title="Редактировать товар")

@bp.route("/admin/delete/<int:product_id>", methods=["POST"])
@login_required
def delete_product(product_id: int):
    _admin_only()
    product = db.session.get(Product, product_id)
    if not product: abort(404)
    db.session.delete(product); db.session.commit()
    flash("Товар удалён.", "warning")
    return redirect(url_for("main.admin"))

@bp.route("/api/products", methods=["GET"])
def api_products():
    return jsonify([p.to_dict() for p in _product_query().all()]), 200

@bp.app_errorhandler(403)
def forbidden(e): return render_template("errors/403.html"), 403
@bp.app_errorhandler(404)
def not_found(e): return render_template("errors/404.html"), 404
@bp.app_errorhandler(500)
def server_error(e):
    db.session.rollback(); logger.exception("Internal error")
    return render_template("errors/500.html"), 500