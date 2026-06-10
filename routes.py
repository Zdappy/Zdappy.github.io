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
from models import Category, Product, User, ProductImage, Order, OrderItem, Post

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

def product_query():
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
        
    posts = Post.query.order_by(Post.date_posted.desc()).limit(10).all()
    return render_template("index.html", categories=categories, products=products, favorites_ids=favorites_ids, posts=posts)

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

    if request.method == "POST":
        if "old_password" in request.form or "new_password" in request.form:
            if password_form.validate_on_submit():
                if current_user.check_password(password_form.old_password.data):
                    current_user.set_password(password_form.new_password.data)
                    db.session.commit()
                    flash("Пароль изменен.", "success")
                    return redirect(url_for("main.profile"))
                flash("Неверный текущий пароль.", "error")
            else:
                _flash_errors(password_form)

        elif "email" in request.form and "login" not in request.form and "surname" not in request.form and "name" not in request.form:
            new_email = (request.form.get("email") or "").strip()
            if not new_email:
                flash("E-mail не может быть пустым.", "error")
            elif new_email != current_user.email and User.query.filter_by(email=new_email).first():
                flash("Такой email уже зарегистрирован.", "error")
            else:
                current_user.email = new_email
                db.session.commit()
                flash("E-mail обновлён.", "success")
                return redirect(url_for("main.profile"))

        elif "login" in request.form and "surname" not in request.form and "name" not in request.form and "email" not in request.form:
            new_login = (request.form.get("login") or "").strip().lower()
            if len(new_login) < 3:
                flash("Логин должен содержать минимум 3 символа.", "error")
            elif new_login != current_user.username and User.query.filter_by(username=new_login).first():
                flash("Такой логин уже занят.", "error")
            else:
                current_user.username = new_login
                db.session.commit()
                flash("Логин обновлён.", "success")
                return redirect(url_for("main.profile"))

        elif "surname" in request.form and "name" not in request.form and "login" not in request.form and "email" not in request.form:
            new_surname = (request.form.get("surname") or "").strip()
            if len(new_surname) < 2:
                flash("Фамилия должна содержать минимум 2 символа.", "error")
            else:
                current_user.surname = new_surname
                db.session.commit()
                flash("Фамилия обновлена.", "success")
                return redirect(url_for("main.profile"))

        elif "name" in request.form and "surname" not in request.form and "login" not in request.form and "email" not in request.form:
            new_name = (request.form.get("name") or "").strip()
            if len(new_name) < 2:
                flash("Имя должно содержать минимум 2 символа.", "error")
            else:
                current_user.name = new_name
                db.session.commit()
                flash("Имя обновлено.", "success")
                return redirect(url_for("main.profile"))

    orders = Order.query.filter_by(user_id=current_user.id).order_by(Order.created_at.desc()).all()
    return render_template("profile.html", edit_form=edit_form, password_form=password_form, orders=orders)

@bp.route("/basket")
def basket():
    return render_template("basket.html")

@bp.route("/api/checkout", methods=["POST"])
def checkout():
    if not current_user.is_authenticated:
        return jsonify({"success": False, "error": "Сначала войдите в аккаунт, чтобы оформить заказ."}), 401

    data = request.get_json(silent=True) or {}
    items = data.get("items") or []
    if not items:
        return jsonify({"success": False, "error": "Корзина пуста"}), 400

    normalized_items: dict[int, int] = {}
    for item in items:
        try:
            product_id = int(item.get("id"))
            qty = max(1, int(item.get("quantity", 1)))
        except (TypeError, ValueError, AttributeError):
            continue
        normalized_items[product_id] = normalized_items.get(product_id, 0) + qty

    if not normalized_items:
        return jsonify({"success": False, "error": "Не удалось оформить заказ"}), 400

    total = 0.0
    last_order = Order.query.filter_by(user_id=current_user.id).order_by(Order.user_order_number.desc()).first()
    next_number = (last_order.user_order_number + 1) if last_order else 1
    order = Order(user_id=current_user.id, total_price=0, user_order_number=next_number)
    db.session.add(order)
    db.session.flush()

    for product_id, qty in normalized_items.items():
        product = db.session.get(Product, product_id)
        if not product:
            continue

        price = float(product.price)
        total += qty * price
        db.session.add(
            OrderItem(
                order_id=order.id,
                product_name=product.name,
                quantity=qty,
                price=price,
            )
        )

    if total <= 0:
        db.session.rollback()
        return jsonify({"success": False, "error": "Не удалось оформить заказ"}), 400

    order.total_price = total
    db.session.commit()
    return jsonify({"success": True, "order_id": order.id, "order_number": next_number}), 200

@bp.route("/admin")
@login_required
def admin():
    _admin_only()
    return render_template("admin.html", products=Product.query.order_by(Product.id.desc()).all(), posts=Post.query.order_by(Post.id.desc()).all())

@bp.route("/admin/add", methods=["GET", "POST"])
@login_required
def add_product():
    _admin_only()
    form = ProductForm()
    if form.validate_on_submit():
        main_file = request.files.get('main_image')
        main_url = _save_file(main_file) if main_file else None
        category_id = request.form.get("category", type=int) or form.category.data
        product = Product(name=form.name.data.strip(), description=form.description.data.strip(), price=float(form.price.data), image_url=main_url, category_id=category_id)
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

    if request.method == "POST":
        form.category.data = request.form.get("category", type=int) or product.category_id

    if form.validate_on_submit():
        product.name = form.name.data.strip()
        product.description = form.description.data.strip()
        product.price = float(form.price.data)

        selected_category_id = request.form.get("category", type=int) or form.category.data
        if selected_category_id:
            product.category_id = selected_category_id

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

@bp.route("/admin/edit_post/<int:post_id>", methods=["GET", "POST"])
@login_required
def edit_post(post_id):
    _admin_only()
    post = Post.query.get_or_404(post_id)
    if request.method == "POST":
        post.title = request.form.get("title")
        post.content = request.form.get("content")
        post.image_post = request.form.get("image_post")
        try:
            db.session.commit()
            flash("Статья успешно обновлена!", "success")
            return redirect(url_for("main.admin"))
        except Exception as e:
            db.session.rollback()
            flash(f"Ошибка при обновлении: {e}", "danger")
    return render_template("admin_post_form.html", post=post, title="Редактировать статью")

@bp.route("/admin/delete_post/<int:post_id>", methods=["POST"])
@login_required 
def delete_post(post_id: int):
    _admin_only()
    post = db.session.get(Post, post_id)
    if not post:
        abort(404)
    try:
        db.session.delete(post)
        db.session.commit()
        flash("Статья успешно удалена.", "success")
    except Exception as e:
        db.session.rollback()
        flash("Ошибка при удалении статьи.", "danger")
    return redirect(url_for("main.admin"))

@bp.route("/admin/bulk-upload", methods=["GET"])
@login_required
def bulk_upload():
    _admin_only()
    return render_template("bulk_upload.html")

@bp.route("/admin/bulk-upload", methods=["POST"])
@login_required
def bulk_upload_process():
    _admin_only()
    data = request.get_json()
    if not data or 'products' not in data:
        return jsonify({"error": "Нет данных"}), 400
    products_data = data['products']
    created = 0
    errors = []
    categories = {c.slug: c.id for c in Category.query.all()}
    for idx, p in enumerate(products_data):
        try:
            name = p.get('name', '').strip()
            description = p.get('description', '').strip()
            price = float(p.get('price', 0))
            category_slug = p.get('category_slug', '').strip()
            image_urls_str = p.get('image_urls', '').strip()
            if not name or not description or price <= 0 or category_slug not in categories:
                errors.append(f"Строка {idx + 1}: некорректные данные")
                continue
            main_image = None
            extra_images = []
            if image_urls_str:
                images_list = [img.strip() for img in image_urls_str.split(';') if img.strip()]
                if images_list:
                    img_path = images_list[0]
                    if not img_path.startswith('/'):
                        main_image = f"/static/{img_path.lstrip('/')}"
                    else:
                        main_image = img_path
                    for extra_path in images_list[1:]:
                        if not extra_path.startswith('/'):
                            extra_images.append(f"/static/{extra_path.lstrip('/')}")
                        else:
                            extra_images.append(extra_path)
            product = Product(name=name, description=description, price=price, category_id=categories[category_slug], image_url=main_image)
            db.session.add(product)
            db.session.flush()
            for idx_extra, img_url in enumerate(extra_images):
                img = ProductImage(product_id=product.id, url=img_url, order=idx_extra)
                db.session.add(img)
            created += 1
        except Exception as e:
            errors.append(f"Строка {idx + 1}: {str(e)}")
    db.session.commit()
    return jsonify({"success": True, "created": created, "errors": errors}), 200

@bp.route('/admin/add_post', methods=['GET', 'POST'])
@login_required
def add_post():
    _admin_only()
    if request.method == 'POST':
        title = request.form.get('title')
        content = request.form.get('content')
        image_post = request.form.get('image_post') 
        product_id = request.form.get('product_id') 

        if not title or not content:
            flash('Заголовок и текст статьи обязательны для заполнения!', 'danger')
            return redirect(url_for('main.add_post'))

        if product_id == '':
            product_id = None
            
        new_post = Post(
            title=title,
            content=content,
            image_post=image_post,
            product_id=product_id,
            date_posted=datetime.utcnow()
        )

        db.session.add(new_post)
        db.session.commit()

        flash('Статья успешно добавлена!', 'success')
        return redirect(url_for('main.admin')) 

    products = Product.query.all()
    return render_template('admin_post_form.html', products=products)


@bp.route("/api/products", methods=["GET"])
def api_products():
    return jsonify([p.to_dict() for p in product_query().all()]), 200

@bp.route("/product/<int:product_id>")
def product_detail(product_id):
    product = Product.query.get_or_404(product_id)
    extra_urls = [img.url for img in product.extra_images.order_by(ProductImage.order).all()]
    all_images = []
    if product.image_url:
        all_images.append(product.image_url)
    all_images.extend(extra_urls)
    favorites_ids = []
    if current_user.is_authenticated:
        favorites_ids = [p.id for p in current_user.favorite_products.all()]
    else:
        favorites_ids = []
    posts = Post.query.order_by(
        (Post.product_id == product_id).desc(), # Сначала True (совпадающие), потом False
        Post.date_posted.desc()                 # Внутри групп сортируем по свежести
    ).limit(10).all()
    return render_template('product_page.html', product=product, all_images=all_images, favorites_ids=favorites_ids, posts=posts)

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

@bp.route('/blog')
def blog():
    posts = Post.query.order_by(Post.date_posted.desc()).all()
    return render_template('blog.html', posts=posts)

@bp.route('/blog/<int:post_id>')
def post_detail(post_id):
    post = Post.query.get_or_404(post_id)
    return render_template('post.html', post=post)

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