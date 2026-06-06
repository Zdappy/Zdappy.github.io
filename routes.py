from __future__ import annotations
import os
import logging
import uuid
from datetime import datetime
from werkzeug.utils import secure_filename
from flask import Blueprint, abort, flash, jsonify, redirect, render_template, request, session, url_for, current_app
from flask_login import current_user, login_required, login_user, logout_user
from sqlalchemy import or_
from extensions import db, login_manager
from forms import LoginForm, ProductForm, RegistrationForm, ProfileEditForm, ChangePasswordForm
from models import Category, Product, User, ProductImage, Order, OrderItem

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

bp = Blueprint("main", __name__)
logger = logging.getLogger(__name__)

@login_manager.user_loader
def load_user(user_id: str):
    try:
        return db.session.get(User, int(user_id))
    except:
        return None

def _admin_only():
    if not current_user.is_authenticated or not current_user.is_admin:
        abort(403)

def _save_file(file) -> str | None:
    if not file or file.filename == '':
        return None
    if not allowed_file(file.filename):
        return None
    original_filename = secure_filename(file.filename)
    if '.' in original_filename:
        ext = original_filename.rsplit('.', 1)[1].lower()
        unique_filename = f"{uuid.uuid4().hex}.{ext}"
    else:
        unique_filename = uuid.uuid4().hex
    file.save(os.path.join(current_app.config['UPLOAD_FOLDER'], unique_filename))
    return url_for('static', filename=f'uploads/{unique_filename}')

def _flash_errors(form):
    for field, errors in form.errors.items():
        for err in errors:
            flash(f"{getattr(form, field).label.text or field}: {err}", "error")

@bp.route("/")
def index():
    categories = Category.query.order_by(Category.name).all()
    cat_slug = (request.args.get("category") or "").strip()
    search = (request.args.get("search") or "").strip()
    if cat_slug == "favorites":
        if current_user.is_authenticated:
            products = current_user.favorite_products.all()
        else:
            products = []
            flash("Войдите, чтобы просмотреть избранное", "info")
        if search:
            products = [p for p in products if search.lower() in p.name.lower() or search.lower() in p.description.lower()]
    else:
        query = Product.query
        if cat_slug and cat_slug != "all":
            query = query.join(Category).filter(Category.slug == cat_slug)
        if search:
            like = f"%{search}%"
            query = query.filter(or_(Product.name.ilike(like), Product.description.ilike(like)))
        products = query.order_by(Product.id.desc()).all()
    favorites_ids = []
    if current_user.is_authenticated:
        favorites_ids = [p.id for p in current_user.favorite_products.all()]
    return render_template("index.html", categories=categories, products=products, favorites_ids=favorites_ids)

@bp.route("/auth/login", methods=["GET", "POST"])
def login():
    if current_user.is_authenticated:
        return redirect(url_for("main.index"))
    form = LoginForm()
    if form.validate_on_submit():
        login_value = form.login.data.strip()
        user = User.query.filter(or_(User.username == login_value, User.email == login_value)).first()
        if user and user.check_password(form.password.data):
            login_user(user)
            return redirect(request.args.get("next") or url_for("main.index"))
        flash("Неверный логин/email или пароль.", "error")
    elif request.method == "POST":
        _flash_errors(form)
    return render_template("login.html", form=form)

@bp.route("/auth/register", methods=["GET", "POST"])
def register():
    if current_user.is_authenticated:
        return redirect(url_for("main.index"))
    form = RegistrationForm()
    if form.validate_on_submit():
        username = form.login.data.strip().lower()
        u = User(username=username, email=form.email.data.strip(),
                 surname=form.surname.data.strip(), name=form.name.data.strip(), patronymic=None)
        u.set_password(form.password.data)
        db.session.add(u)
        db.session.commit()
        flash("Регистрация успешна. Войдите.", "success")
        return redirect(url_for("main.login"))
    elif request.method == "POST":
        _flash_errors(form)
    return render_template("register.html", form=form)

@bp.route("/auth/logout")
@login_required
def logout():
    logout_user()
    flash("Вы вышли.", "info")
    return redirect(url_for("main.index"))

@bp.route("/profile", methods=["GET", "POST"])
@login_required
def profile():
    edit_form = ProfileEditForm(obj=current_user)
    edit_form.login.data = current_user.username
    password_form = ChangePasswordForm()
    
    if edit_form.validate_on_submit():
        current_user.surname = edit_form.surname.data.strip()
        current_user.name = edit_form.name.data.strip()
        current_user.username = edit_form.login.data.strip().lower()
        current_user.email = edit_form.email.data.strip()
        db.session.commit()
        flash("Данные обновлены.", "success")
        return redirect(url_for("main.profile"))

    if password_form.validate_on_submit():
        if current_user.check_password(password_form.old_password.data):
            current_user.set_password(password_form.new_password.data)
            db.session.commit()
            flash("Пароль изменен.", "success")
            return redirect(url_for("main.profile"))
        else:
            flash("Неверный текущий пароль.", "error")

    page = request.args.get('page', 1, type=int)
    pagination = Order.query.filter_by(user_id=current_user.id).order_by(Order.created_at.desc()).paginate(page=page, per_page=10)
    orders = pagination.items
    
    return render_template("profile.html", edit_form=edit_form, password_form=password_form, orders=orders, pagination=pagination)

@bp.route("/basket")
def basket():
    return render_template("basket.html")

@bp.route("/api/checkout", methods=["POST"])
@login_required
def checkout():
    data = request.get_json()
    if not data or 'items' not in data or not data['items']:
        return jsonify({"error": "Корзина пуста"}), 400
    items = data['items']
    total = 0
    order = Order(user_id=current_user.id, total_price=0)
    db.session.add(order)
    db.session.flush()
    for item in items:
        qty = int(item.get('quantity', 1))
        price = float(item.get('price_value', 0))
        total += qty * price
        db.session.add(OrderItem(order_id=order.id, product_name=item.get('title', 'Товар'), quantity=qty, price=price))
    order.total_price = total
    db.session.commit()
    return jsonify({"success": True, "order_id": order.id}), 200

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
        main_file = request.files.get('main_image')
        main_url = _save_file(main_file) if main_file else None
        product = Product(name=form.name.data.strip(), description=form.description.data.strip(), price=float(form.price.data), image_url=main_url, category_id=form.category.data)
        db.session.add(product)
        db.session.flush()
        extra_files = request.files.getlist('extra_images')
        for idx, file in enumerate(extra_files):
            url = _save_file(file)
            if url:
                img = ProductImage(product_id=product.id, url=url, order=idx)
                db.session.add(img)
        db.session.commit()
        flash("Товар добавлен.", "success")
        return redirect(url_for("main.admin"))
    elif request.method == "POST":
        _flash_errors(form)
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
        product.category_id = form.category.data
        main_file = request.files.get('main_image')
        if main_file and main_file.filename != '':
            if product.image_url:
                old_path = product.image_url.replace(url_for('static', filename=''), '')
                if old_path.startswith('uploads/'):
                    full_old = os.path.join(current_app.config['UPLOAD_FOLDER'], old_path[8:])
                    if os.path.exists(full_old):
                        os.remove(full_old)
            new_url = _save_file(main_file)
            if new_url:
                product.image_url = new_url
        extra_files = request.files.getlist('extra_images')
        max_order = db.session.query(db.func.max(ProductImage.order)).filter_by(product_id=product.id).scalar() or -1
        for file in extra_files:
            url = _save_file(file)
            if url:
                max_order += 1
                img = ProductImage(product_id=product.id, url=url, order=max_order)
                db.session.add(img)
        delete_ids = request.form.getlist('delete_extra_ids')
        for img_id in delete_ids:
            img = ProductImage.query.get(int(img_id))
            if img and img.product_id == product.id:
                file_path = img.url.replace(url_for('static', filename=''), '')
                if file_path.startswith('uploads/'):
                    full_path = os.path.join(current_app.config['UPLOAD_FOLDER'], file_path[8:])
                    if os.path.exists(full_path):
                        os.remove(full_path)
                db.session.delete(img)
        db.session.commit()
        flash("Товар обновлён.", "success")
        return redirect(url_for("main.admin"))
    elif request.method == "POST":
        _flash_errors(form)
    return render_template("admin_form.html", form=form, title="Редактировать товар", product=product)

@bp.route("/admin/delete/<int:product_id>", methods=["POST"])
@login_required
def delete_product(product_id: int):
    _admin_only()
    product = db.session.get(Product, product_id)
    if not product:
        abort(404)
    if product.image_url:
        old_path = product.image_url.replace(url_for('static', filename=''), '')
        if old_path.startswith('uploads/'):
            full_old = os.path.join(current_app.config['UPLOAD_FOLDER'], old_path[8:])
            if os.path.exists(full_old):
                os.remove(full_old)
    for img in product.extra_images.all():
        file_path = img.url.replace(url_for('static', filename=''), '')
        if file_path.startswith('uploads/'):
            full_path = os.path.join(current_app.config['UPLOAD_FOLDER'], file_path[8:])
            if os.path.exists(full_path):
                os.remove(full_path)
        db.session.delete(img)
    db.session.delete(product)
    db.session.commit()
    flash("Товар удалён.", "warning")
    return redirect(url_for("main.admin"))

@bp.route("/api/products", methods=["GET"])
def api_products():
    return jsonify([p.to_dict() for p in Product.query.order_by(Product.id.desc()).all()]), 200

@bp.route("/product/<int:product_id>")
def product_detail(product_id):
    product = Product.query.get_or_404(product_id)
    extra_urls = [img.url for img in product.extra_images.order_by(ProductImage.order).all()]
    all_images = []
    if product.image_url:
        all_images.append(product.image_url)
    all_images.extend(extra_urls)
    if current_user.is_authenticated:
        favorites_ids = [p.id for p in current_user.favorite_products.all()]
    else:
        favorites_ids = []
    return render_template('product_page.html', product=product, all_images=all_images, favorites_ids=favorites_ids)

@bp.route("/favorites/toggle/<int:product_id>", methods=["POST"])
@login_required
def toggle_favorite(product_id: int):
    product = Product.query.get_or_404(product_id)
    if product in current_user.favorite_products:
        current_user.favorite_products.remove(product)
        flash("Товар удалён из избранного", "warning")
    else:
        current_user.favorite_products.append(product)
        flash("Товар добавлен в избранное", "success")
    db.session.commit()
    return redirect(request.referrer or url_for("main.index"))

@bp.route("/favorites/remove/<int:product_id>", methods=["POST"])
@login_required
def remove_favorite(product_id: int):
    product = Product.query.get_or_404(product_id)
    if product in current_user.favorite_products:
        current_user.favorite_products.remove(product)
        db.session.commit()
    return redirect(request.referrer or url_for("main.index"))

@bp.app_errorhandler(403)
def forbidden(e):
    return render_template("errors/403.html"), 403

@bp.app_errorhandler(404)
def not_found(e):
    return render_template("errors/404.html"), 404

@bp.app_errorhandler(500)
def server_error(e):
    db.session.rollback()
    logger.exception("Internal error")
    return render_template("errors/500.html"), 500