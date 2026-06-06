from __future__ import annotations
from flask_wtf import FlaskForm
from flask_wtf.file import FileField, FileAllowed, MultipleFileField
from wtforms import FloatField, PasswordField, SelectField, StringField, SubmitField, TextAreaField, EmailField
from wtforms.validators import DataRequired, Email, Length, NumberRange, ValidationError, EqualTo
from models import Category, User

class LoginForm(FlaskForm):
    login = StringField("Логин или Email", validators=[DataRequired(), Length(min=3, max=120)])
    password = PasswordField("Пароль", validators=[DataRequired(), Length(min=3, max=128)])
    submit = SubmitField("Войти")

class RegistrationForm(FlaskForm):
    surname = StringField("Фамилия", validators=[DataRequired(), Length(min=2, max=80)])
    name = StringField("Имя", validators=[DataRequired(), Length(min=2, max=80)])
    login = StringField("Логин", validators=[DataRequired(), Length(min=3, max=80)])
    email = EmailField("E-mail", validators=[DataRequired(), Email(), Length(max=120)])
    password = PasswordField("Пароль", validators=[DataRequired(), Length(min=6, max=128)])
    password_confirm = PasswordField("Повтор пароля", validators=[DataRequired(), EqualTo('password', message='Пароли не совпадают')])
    submit = SubmitField("Зарегистрироваться")

    def validate_login(self, field):
        if User.query.filter_by(username=field.data.strip().lower()).first():
            raise ValidationError("Такой логин уже занят.")
    def validate_email(self, field):
        if User.query.filter_by(email=field.data).first():
            raise ValidationError("Такой email уже зарегистрирован.")

class ProductForm(FlaskForm):
    name = StringField('Название', validators=[DataRequired()])
    description = TextAreaField('Описание', validators=[DataRequired()])
    price = FloatField('Цена', validators=[DataRequired()])
    category = SelectField('Категория', coerce=int, validators=[DataRequired()])
    image_url = StringField('URL изображения (опционально)')
    main_image = FileField('Основное изображение', validators=[FileAllowed(['jpg','png','jpeg','gif','webp'], 'Только изображения!')])
    extra_images = MultipleFileField('Дополнительные изображения', validators=[FileAllowed(['jpg','png','jpeg','gif','webp'], 'Только изображения!')])

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.category.choices = [(c.id, c.name) for c in Category.query.order_by(Category.name).all()]

class ProfileEditForm(FlaskForm):
    surname = StringField("Фамилия", validators=[DataRequired(), Length(min=2, max=80)])
    name = StringField("Имя", validators=[DataRequired(), Length(min=2, max=80)])
    login = StringField("Логин", validators=[DataRequired(), Length(min=3, max=80)])
    email = EmailField("E-mail", validators=[DataRequired(), Email(), Length(max=120)])
    submit = SubmitField("Сохранить")

class ChangePasswordForm(FlaskForm):
    old_password = PasswordField("Текущий пароль", validators=[DataRequired()])
    new_password = PasswordField("Новый пароль", validators=[DataRequired(), Length(min=6, max=128)])
    new_password_confirm = PasswordField("Подтвердите новый пароль", validators=[DataRequired(), EqualTo('new_password', message='Пароли не совпадают')])
    submit = SubmitField("Изменить пароль")
    