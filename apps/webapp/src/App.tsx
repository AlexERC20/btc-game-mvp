import React from 'react'

const Tab = ({ children, active=false }: {children: React.ReactNode, active?: boolean}) => (
  <button className={`px-4 py-2 rounded-xl border text-sm
    ${active ? 'bg-neutral-800 border-neutral-700' : 'bg-neutral-900 border-neutral-800 hover:bg-neutral-800'}`}>
    {children}
  </button>
)

export default function App() {
  return (
    <div className="min-h-full pt-[calc(12px+var(--sat))] pb-[calc(12px+var(--sab))] px-4 sm:px-6">
      {/* Topbar */}
      <div className="max-w-6xl mx-auto flex items-center gap-3 mb-4">
        <button className="px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-sm">Back</button>
        <div className="text-neutral-300 text-sm">Get Images</div>
        <div className="ml-auto text-neutral-500 text-xs">09:41</div>
      </div>

      {/* Workspace */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: controls */}
        <div className="lg:col-span-5 space-y-4">
          {/* Card */}
          <div className="rounded-2xl bg-neutral-900/70 border border-neutral-800 p-4 shadow-[0_0_30px_rgba(0,0,0,0.35)]">
            <label className="block text-sm text-neutral-400 mb-2">Text</label>
            <textarea placeholder="Вставь текст сюда…" className="
                w-full h-36 resize-none px-4 py-3 rounded-xl
                bg-neutral-950 border border-neutral-800 outline-none
                placeholder:text-neutral-500 focus:border-neutral-600" />
            <div className="mt-3 flex items-center gap-3">
              <label className="inline-flex items-center">
                <input type="file" accept="image/*" multiple className="hidden" id="pickphotos" />
                <span className="px-4 py-2 rounded-xl bg-neutral-100 text-neutral-900 font-medium text-sm cursor-pointer select-none"
                  onClick={() => document.getElementById('pickphotos')?.click()}
                >
                  Добавить фото
                </span>
              </label>
              <select className="px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-sm">
                <option>Авто</option>
                <option>3 слайда</option>
                <option>5 слайдов</option>
                <option>8 слайдов</option>
              </select>
            </div>
          </div>

          {/* Bottom toolbar (tabs) */}
          <div className="rounded-2xl bg-neutral-900/70 border border-neutral-800 p-3 flex flex-wrap gap-2">
            <Tab active>Template</Tab>
            <Tab>Color</Tab>
            <Tab>Layout</Tab>
            <Tab>Photos</Tab>
            <Tab>Info</Tab>
            <Tab>Export</Tab>
          </div>
        </div>

        {/* RIGHT: preview carousel */}
        <div className="lg:col-span-7">
          <div className="rounded-3xl bg-neutral-900/70 border border-neutral-800 p-4 lg:p-6
                          shadow-[0_0_60px_rgba(0,0,0,0.35)]">
            <div className="text-neutral-400 text-sm mb-3">Preview</div>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {/* Один слайд-превью — визуально как карточка 4:5 */}
              <div className="shrink-0 w-[260px] aspect-[4/5] rounded-3xl overflow-hidden bg-neutral-800 relative">
                <img src="" alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />
                <div className="absolute inset-0 bg-black/25" />
                <div className="absolute left-4 right-4 bottom-4 text-[15px] leading-[1.35]">
                  <div className="inline-block bg-[#5B4BFF] text-white px-2.5 py-1.5 rounded-lg font-semibold mb-2">
                    Выгорание убивает контент-план. Что делать?
                  </div>
                  <div className="text-neutral-100/90">
                    Система против мотивации. Показываю рабочий подход
                  </div>
                  <div className="mt-3 text-neutral-300 text-xs">@username</div>
                </div>
                <div className="absolute right-4 bottom-4 text-neutral-300 text-xs">1/8</div>
              </div>

              {/* Пустые-превью для эффекта карусели */}
              <div className="shrink-0 w-[260px] aspect-[4/5] rounded-3xl bg-neutral-850/40 border border-neutral-800" />
              <div className="shrink-0 w-[260px] aspect-[4/5] rounded-3xl bg-neutral-850/40 border border-neutral-800" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

