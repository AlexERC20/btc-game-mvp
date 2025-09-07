import React from 'react'

export default function App() {
  return (
    <div className="min-h-screen p-6 flex items-start justify-center">
      <div className="w-full max-w-4xl space-y-4">
        <h1 className="text-2xl font-semibold">Carousel MVP</h1>

        {/* Первый экран: вставить текст + выбрать фото (пока заглушки) */}
        <textarea
          placeholder="Вставь текст сюда…"
          className="w-full h-40 p-4 border rounded-lg"
        />

        <div className="flex gap-3">
          <button className="px-4 py-2 rounded-lg border">Добавить фото</button>
          <select className="px-3 py-2 rounded-lg border">
            <option>Авто</option>
            <option>3 слайда</option>
            <option>5 слайдов</option>
            <option>8 слайдов</option>
          </select>
        </div>

        <div className="flex gap-2 text-sm opacity-70">
          <span>Template</span>
          <span>Color</span>
          <span>Layout</span>
          <span>Photos</span>
          <span>Info</span>
          <span>Export</span>
        </div>

        <div className="aspect-[4/5] w-72 border rounded-xl flex items-center justify-center">
          Превью слайда
        </div>
      </div>
    </div>
  )
}
