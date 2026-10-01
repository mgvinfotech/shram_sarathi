<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Wallet;
use Illuminate\Database\Seeder;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        // Create default admin if not exists
        $admin = User::firstOrCreate(
            ['phone' => '9999999999'],
            [
                'name'                => 'Super Admin',
                'role'                => 'admin',
                'is_verified'         => true,
                'is_active'           => true,
                'verification_status' => 'verified',
            ]
        );

        if (!$admin->password) {
            $admin->setPassword('admin123');
            $admin->save();
        }

        Wallet::firstOrCreate(['user_id' => $admin->id]);

        $this->command->info("✅ Admin created: phone=9999999999, password=admin123");
        $this->command->warn("⚠️  Change the password after first login!");
    }
}
