"use client";

export default function HomePage() {
  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12">
        <div className="md:col-span-12 p-3">
          <h1 className="text-2xl font-bold">Hello World</h1>
        </div>
      </div>
    </div>
  );
}
