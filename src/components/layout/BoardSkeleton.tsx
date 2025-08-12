import { Skeleton } from "@/components/ui/skeleton";

export const BoardSkeleton = () => {
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Skeleton Header */}
      <header className="flex items-center justify-between p-2 bg-gray-200/80">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-9 w-48 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-64 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </header>
      {/* Skeleton Board Content */}
      <main className="flex-grow p-4 md:p-6 overflow-hidden">
        <div className="flex gap-4 overflow-x-auto pb-4 items-start">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="w-72 flex-shrink-0 bg-gray-200 rounded-md p-3 space-y-3">
              <Skeleton className="h-6 w-3/4 rounded-md" />
              <Skeleton className="h-20 w-full rounded-md" />
              <Skeleton className="h-16 w-full rounded-md" />
              <Skeleton className="h-12 w-full rounded-md" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};