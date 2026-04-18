<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Contracts\Console\Kernel;

$app->make(Kernel::class)->bootstrap();

$users = User::all();
echo "Total users: " . $users->count() . "\n";
foreach ($users as $u) {
    echo "- Email: " . $u->email . " | Role: " . $u->role . " | Approved: " . ($u->is_approved ? 'Yes' : 'No') . "\n";
}

$email = '24je0900@iitism.ac.in';
$user = User::where('email', $email)->first();

if ($user) {
    echo "User found: " . $user->email . "\n";
    $newPassword = 'Password@123';
    $user->password = Hash::make($newPassword);
    $user->is_approved = true;
    $user->save();
    echo "Admin password has been RESET to: " . $newPassword . "\n";
}
