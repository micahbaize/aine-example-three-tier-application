import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="w-screen h-screen bg-[#e9d5ff] flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-8">
          Lost? Find your way home.
        </h1>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
