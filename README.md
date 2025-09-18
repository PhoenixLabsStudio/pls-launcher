# Phoenix Labs Launcher

[![CI](https://github.com/PhoenixLabsStudio/pls-launcher/actions/workflows/release.yml/badge.svg)](https://github.com/PhoenixLabsStudio/pls-launcher/actions/workflows/release.yml)
[![Release](https://img.shields.io/github/v/release/PhoenixLabsStudio/pls-launcher?include_prereleases&label=release)](https://github.com/PhoenixLabsStudio/pls-launcher/releases)
[![Downloads](https://img.shields.io/github/downloads/PhoenixLabsStudio/pls-launcher/total)](https://github.com/PhoenixLabsStudio/pls-launcher/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

Мини-лаунчер студии для запуска проектов (FiveM / SA:MP / CRMP / Arma 3) из одного места.
Поддерживает автообновления через GitHub Releases.

---

## Возможности
- Каталог игр из `resources/games.json`
- Запуск в 1 клик и «Открыть папку»
- Быстрый переход в Discord
- Автообновления (electron-updater)

---

## Установка (пользователь)
1. Скачайте последний установщик из **Releases**.
2. Запустите `.exe`, следуйте мастеру.
3. Первый старт: лаунчер проверит обновления и подтянет нужные файлы.

---

## Сборка локально (разработчик)

### Требования
- Windows 10/11
- Node.js 20+
- Git

### Команды
```bash
# клонирование
git clone https://github.com/PhoenixLabsStudio/pls-launcher.git
cd pls-launcher

# зависимости
npm ci

# dev-запуск
npm start

# прод-сборка (инсталлер в /release)
npm run dist