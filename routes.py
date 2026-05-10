from flask import Blueprint, render_template, redirect, url_for, flash, request, jsonify, session, abort
from flask_login import login_user, logout_user, login_required, current_user
from app import db, login_manager
from models import User, Product, Category
from forms import LoginForm, RegistrationForm, ProductForm

bp = Blueprint('main', __name__)

@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))

@bp.route('/auth/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('main.index'))
    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(username=form.username.data).first()
        if user and user.check_password(form.password.data):
            login_user(user)
            flash('Вы успешно вошли!', 'success')
            return redirect(request.args.get('next') or url_for('main.index'))
        flash('Неверное имя пользователя или пароль', 'error')
    return render_template('login.html', form=form)

@bp.route('/auth/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('main.index'))
    form = RegistrationForm()
    if form.validate_on_submit():
        new_user = User(username=form.username.data, email=form.email.data)
        new_user.set_password(form.password.data)
        db.session.add(new_user)
        db.session.commit()
        flash('Регистрация успешна! Теперь войдите.', 'success')
        return redirect(url_for('main.login'))
    return render_template('register.html', form=form)

@bp.route('/auth/logout')
@login_required
def logout():
    logout_user()
    flash('Вы вышли из системы.', 'info')
    return redirect(url_for('main.index'))

@bp.route('/')
def index():
    cat_id = request.args.get('category_id', type=int)
    if cat_id:
        products = db.session.query(Product).filter_by(category_id=cat_id).all()
    else:
        products = db.session.query(Product).all()
    categories = db.session.query(Category).all()
    return render_template('index.html', products=products, categories=categories)

@bp.route('/admin')
@login_required
def admin():
    if not current_user.is_admin:
        abort(403)
    products = db.session.query(Product).all()
    return render_template('admin.html', products=products)

@bp.route('/admin/add', methods=['GET', 'POST'])
@login_required
def add_product():
    if not current_user.is_admin:
        abort(403)
    form = ProductForm()
    if form.validate_on_submit():
        product = Product(
            title=form.title.data, description=form.description.data,
            price=form.price.data, image_url=form.image_url.data,
            category_id=form.category.data
        )
        db.session.add(product)
        db.session.commit()
        flash('Товар успешно добавлен', 'success')
        return redirect(url_for('main.admin'))
    return render_template('admin_form.html', form=form, title='Добавить товар')

@bp.route('/admin/edit/<int:id>', methods=['GET', 'POST'])
@login_required
def edit_product(id):
    if not current_user.is_admin:
        abort(403)
    product = db.session.get(Product, id)
    if not product:
        abort(404)
    form = ProductForm(obj=product)
    form.category.data = product.category_id
    if form.validate_on_submit():
        form.populate_obj(product)
        db.session.commit()
        flash('Товар обновлен', 'success')
        return redirect(url_for('main.admin'))
    return render_template('admin_form.html', form=form, title='Редактировать товар')

@bp.route('/admin/delete/<int:id>', methods=['POST'])
@login_required
def delete_product(id):
    if not current_user.is_admin:
        abort(403)
    product = db.session.get(Product, id)
    if product:
        db.session.delete(product)
        db.session.commit()
        flash('Товар удален', 'warning')
    return redirect(url_for('main.admin'))

@bp.route('/basket')
def basket():
    cart = session.get('cart', {})
    if cart:
        products = db.session.query(Product).filter(Product.id.in_([int(k) for k in cart.keys()])).all()
    else:
        products = []
    total = sum(p.price * cart.get(str(p.id), 1) for p in products)
    return render_template('basket.html', products=products, cart=cart, total=total)

@bp.route('/cart/add', methods=['POST'])
def add_to_cart():
    data = request.get_json()
    pid = str(data.get('product_id'))
    if not pid:
        return jsonify({'error': 'ID товара не указан'}), 400
    cart = session.get('cart', {})
    cart[pid] = cart.get(pid, 0) + 1
    session['cart'] = cart
    session.modified = True
    return jsonify({'message': 'Добавлено', 'count': cart[pid]}), 200

@bp.route('/api/products', methods=['GET'])
def api_products():
    products = db.session.query(Product).all()
    return jsonify([{
        'id': p.id, 'title': p.title, 'price': p.price,
        'category': p.category.title if p.category else None
    } for p in products]), 200

@bp.route('/api/cart', methods=['GET', 'POST'])
def api_cart():
    if request.method == 'POST':
        data = request.get_json()
        pid = str(data.get('product_id'))
        if not pid:
            return jsonify({'error': 'product_id обязателен'}), 400
        cart = session.get('cart', {})
        cart[pid] = data.get('quantity', 1)
        session['cart'] = cart
        session.modified = True
        return jsonify({'message': 'Корзина обновлена'}), 201
    return jsonify(session.get('cart', {})), 200

@bp.app_errorhandler(403)
def forbidden(e): return render_template('errors/403.html'), 403

@bp.app_errorhandler(404)
def not_found(e): return render_template('errors/404.html'), 404

@bp.app_errorhandler(500)
def server_error(e):
    db.session.rollback()
    return render_template('errors/500.html'), 500