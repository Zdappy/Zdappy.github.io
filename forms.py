from __future__ import annotations
from flask_wtf import FlaskForm
from wtforms import FloatField, PasswordField, SelectField, StringField, SubmitField, TextAreaField
from wtforms.validators import DataRequired, Email, Length, NumberRange, ValidationError
from models import Category, User

class LoginForm(FlaskForm):
    username = StringField("Имя пользователя", validators=[DataRequired(), Length(min=3, max=80)])
    password = PasswordField("Пароль", validators=[DataRequired(), Length(min=3, max=128)])
    submit = SubmitField("Войти")

class RegistrationForm(FlaskForm):
    username = StringField("Имя пользователя", validators=[DataRequired(), Length(min=3, max=80)])
    email = StringField("Email", validators=[DataRequired(), Email(), Length(max=120)])
    password = PasswordField("Пароль", validators=[DataRequired(), Length(min=3, max=128)])
    submit = SubmitField("Зарегистрироваться")

    def validate_username(self, field):
        if User.query.filter_by(username=field.data).first():
            raise ValidationError("Такое имя пользователя уже занято.")

    def validate_email(self, field):
        if User.query.filter_by(email=field.data).first():
            raise ValidationError("Такой email уже зарегистрирован.")

class ProductForm(FlaskForm):
    name = StringField("Название товара", validators=[DataRequired(), Length(min=2, max=200)])
    description = TextAreaField("Описание", validators=[DataRequired(), Length(min=10)])
    price = FloatField("Цена", validators=[DataRequired(), NumberRange(min=0)])
    image_url = StringField("Путь к изображению", validators=[Length(max=255)])
    category = SelectField("Категория", coerce=int, validators=[DataRequired()])
    submit = SubmitField("Сохранить")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.category.choices = [(c.id, c.name) for c in Category.query.order_by(Category.name).all()]