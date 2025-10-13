export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm">
        <h1 className="text-4xl font-bold mb-4">Media Builder</h1>
        <p className="text-lg mb-8">
          Canva-class media builder for images, video, and audio
        </p>
        <div className="grid grid-cols-2 gap-4 max-w-2xl">
          <a
            href="/login"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-center"
          >
            Login
          </a>
          <a
            href="/register"
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 text-center"
          >
            Register
          </a>
        </div>
      </div>
    </main>
  )
}
