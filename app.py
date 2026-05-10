from flask import Flask, render_template, request, redirect, url_for
from models import db, Product, Category


def create_app():
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///shop.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    db.init_app(app)

    with app.app_context():
        db.create_all()
        if not Category.query.first():
            categories = [
                Category(name='Семена'),
                Category(name='Цветы'),
                Category(name='Овощи')
            ]

            db.session.add_all(categories)
            db.session.commit()

    @app.route('/')
    def index():
        products = Product.query.all()
        return render_template('index.html', products=products)

    @app.route('/admin')
    def admin():
        products = Product.query.all()
        return render_template('admin.html', products=products)

    @app.route('/add', methods=['GET', 'POST'])
    def add_product():
        categories = Category.query.all()

        if request.method == 'POST':
            name = request.form['name']
            description = request.form['description']
            price = float(request.form['price'])
            image_url = request.form['image_url']
            category_id = int(request.form['category_id'])

            product = Product(
                name=name,
                description=description,
                price=price,
                image_url=image_url,
                category_id=category_id
            )

            db.session.add(product)
            db.session.commit()

            return redirect(url_for('admin'))

        return render_template('admin_form.html', categories=categories)

    @app.route('/delete/<int:id>')
    def delete_product(id):
        product = Product.query.get_or_404(id)

        db.session.delete(product)
        db.session.commit()

        return redirect(url_for('admin'))

    return app


if __name__ == '__main__':
    app = create_app()
    app.run(debug=True)