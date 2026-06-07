from app import app
from extensions import db
from models import Order, OrderItem

with app.app_context():
    OrderItem.query.delete()
    Order.query.delete()
    db.session.commit()
    print("История заказов очищена.")