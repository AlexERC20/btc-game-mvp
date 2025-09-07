import asyncio
import os
from aiogram import Bot, Dispatcher, types, F
from aiogram.utils.keyboard import InlineKeyboardBuilder

BOT_TOKEN = os.getenv("BOT_TOKEN")
WEBAPP_URL = os.getenv("WEBAPP_URL")


def create_bot() -> Bot:
  if not BOT_TOKEN:
    raise RuntimeError("BOT_TOKEN is not set")
  return Bot(BOT_TOKEN)


def create_dispatcher() -> Dispatcher:
  dp = Dispatcher()

  @dp.message(F.text == "/start")
  async def start(message: types.Message) -> None:
    kb = InlineKeyboardBuilder()
    kb.button(text="Открыть конструктор", web_app=types.WebAppInfo(url=WEBAPP_URL))
    await message.answer("Собери карусель из текста и фото:", reply_markup=kb.as_markup())

  return dp


async def main() -> None:
  bot = create_bot()
  dp = create_dispatcher()
  await dp.start_polling(bot)


if __name__ == "__main__":
  asyncio.run(main())
