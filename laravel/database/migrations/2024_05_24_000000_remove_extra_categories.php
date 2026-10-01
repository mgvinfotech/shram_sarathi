<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $categoryIds = DB::table('categories')
            ->whereIn('slug', ['advocate', 'ca', 'other', 'sarkari_yojana'])
            ->pluck('id');

        if ($categoryIds->isNotEmpty()) {
            DB::table('sub_categories')
                ->whereIn('category_id', $categoryIds)
                ->delete();

            DB::table('categories')
                ->whereIn('id', $categoryIds)
                ->delete();
        }
    }

    public function down(): void
    {
        // No rollback needed
    }
};
