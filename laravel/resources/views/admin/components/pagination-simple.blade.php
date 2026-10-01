@if ($paginator->hasPages())
<nav class="flex items-center justify-end gap-2 mt-4">
    @if ($paginator->onFirstPage())
        <span class="px-3 py-1.5 text-sm text-gray-300 border border-gray-200 rounded-lg cursor-not-allowed">← Prev</span>
    @else
        <a href="{{ $paginator->previousPageUrl() }}"
           class="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">← Prev</a>
    @endif

    @if ($paginator->hasMorePages())
        <a href="{{ $paginator->nextPageUrl() }}"
           class="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Next →</a>
    @else
        <span class="px-3 py-1.5 text-sm text-gray-300 border border-gray-200 rounded-lg cursor-not-allowed">Next →</span>
    @endif
</nav>
@endif
