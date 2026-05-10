from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, FloatField, TextAreaField, SelectField, SubmitField
from wtforms.validators import DataRequired, Email, Length, NumberRange, ValidationError
from app import db
from models import User, Category

class LoginForm(FlaskForm):
    username = StringField('Имя пользователя', validators=[DataRequired(), Length(min=3, max=80)])
    password = PasswordField('Пароль', validators=[DataRequired(), Length(min=6)])
    submit = SubmitField('Войти')

class RegistrationForm(FlaskForm):
    username = StringField('Имя пользователя', validators=[DataRequired(), Length(min=3, max=80)])
    email = StringField('Email', validators=[DataRequired(), Email()])
    password = PasswordField('Пароль', validators=[DataRequired(), Length(min=6)])
    submit = SubmitField('Зарегистрироваться')

    def validate_username(self, username):
        if User.query.filter_by(username=username.data).first():
            raise ValidationError('Такое имя пользователя уже занято.')

    def validate_email(self, email):
        if User.query.filter_by(email=email.data).first():
            raise ValidationError('Такой email уже зарегистрирован.')

class ProductForm(FlaskForm):
    title = StringField('Название товара', validators=[DataRequired(), Length(max=150)])
    description = TextAreaField('Описание')
    price = FloatField('Цена', validators=[DataRequired(), NumberRange(min=0)])
    image_url = StringField('Ссылка на изображение')
    category = SelectField('Категория', coerce=int)
    submit = SubmitField('Сохранить товар')

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.category.choices = [(c.id, c.title) for c in Category.query.all()] or [(0, 'Нет категорий')]
        self.category.choices.insert(0, (0, 'Выберите категорию'))