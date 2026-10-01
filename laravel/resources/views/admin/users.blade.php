@extends('admin.layouts.app')

@section('title', $t['users'])

@section('content')
<div class="p-6">

    <div class="mb-6 flex justify-between items-center">
        <h1 class="text-2xl font-bold text-gray-900">{{ $t['userManagement'] }}</h1>
        <button onclick="document.getElementById('createAgentModal').classList.remove('hidden')"
            class="btn-primary flex items-center gap-2">
            <i data-lucide="plus" class="w-4 h-4"></i> {{ $t['createAgent'] }}
        </button>
    </div>

    <!-- Filters -->
    <form method="GET" action="{{ route('admin.users') }}" class="flex gap-4 mb-6">
        <div class="relative flex-1 max-w-md">
            <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4"></i>
            <input type="text" name="search" placeholder="{{ $t['searchPlaceholder'] }}"
                value="{{ request('search') }}"
                class="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
        </div>
        <select name="role" class="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
            <option value="">{{ $t['allRoles'] }}</option>
            <option value="customer"  {{ request('role') === 'customer'  ? 'selected' : '' }}>{{ $t['customer'] }}</option>
            <option value="provider"  {{ request('role') === 'provider'  ? 'selected' : '' }}>{{ $t['provider'] }}</option>
            <option value="agent"     {{ request('role') === 'agent'     ? 'selected' : '' }}>{{ $t['agent'] }}</option>
            <option value="admin"     {{ request('role') === 'admin'     ? 'selected' : '' }}>{{ $t['admin'] }}</option>
            <option value="sub_admin" {{ request('role') === 'sub_admin' ? 'selected' : '' }}>{{ $t['subAdmin'] }}</option>
        </select>
        <button type="submit" class="btn-primary">{{ $t['filter'] }}</button>
        @if(request('search') || request('role'))
            <a href="{{ route('admin.users') }}" class="btn-secondary">{{ $t['clear'] }}</a>
        @endif
    </form>

    <!-- Table -->
    <div class="card overflow-hidden">
        <table class="w-full text-sm">
            <thead class="bg-gray-50 border-b border-gray-100">
                <tr>
                    <th class="table-th">{{ $t['name'] }}</th>
                    <th class="table-th">{{ $t['mobile'] }}</th>
                    <th class="table-th">{{ $t['role'] }}</th>
                    <th class="table-th">{{ $t['verification'] }}</th>
                    <th class="table-th">{{ $t['status'] }}</th>
                    <th class="table-th">{{ $t['joined'] }}</th>
                    <th class="table-th">{{ $t['actions'] }}</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
                @forelse($users as $user)
                <tr class="hover:bg-gray-50 transition-colors">
                    <td class="table-td font-medium text-gray-900">{{ $user->name }}</td>
                    <td class="table-td text-gray-600">{{ $user->phone }}</td>
                    <td class="table-td">
                        @php
                            $roleColors = [
                                'customer'  => 'bg-blue-100 text-blue-700',
                                'provider'  => 'bg-orange-100 text-orange-700',
                                'admin'     => 'bg-purple-100 text-purple-700',
                                'agent'     => 'bg-teal-100 text-teal-700',
                                'sub_admin' => 'bg-pink-100 text-pink-700',
                            ];
                            $roleLabels = [
                                'customer'  => $t['customer'],
                                'provider'  => $t['provider'],
                                'admin'     => $t['admin'],
                                'agent'     => $t['agent'],
                                'sub_admin' => $t['subAdmin'],
                            ];
                        @endphp
                        <span class="badge {{ $roleColors[$user->role] ?? 'bg-gray-100 text-gray-700' }}">
                            {{ $roleLabels[$user->role] ?? $user->role }}
                        </span>
                    </td>
                    <td class="table-td">
                        @php
                            $verifyColors = [
                                'verified' => 'bg-green-100 text-green-700',
                                'pending'  => 'bg-yellow-100 text-yellow-700',
                                'rejected' => 'bg-red-100 text-red-700',
                            ];
                            $verifyLabels = [
                                'verified' => $t['verified'],
                                'pending'  => $t['pending'],
                                'rejected' => $t['rejected'],
                            ];
                        @endphp
                        <span class="badge {{ $verifyColors[$user->verification_status] ?? 'bg-gray-100 text-gray-700' }}">
                            {{ $verifyLabels[$user->verification_status] ?? $user->verification_status }}
                        </span>
                    </td>
                    <td class="table-td">
                        @if($user->is_blacklisted)
                            <span class="badge bg-red-100 text-red-700">{{ $t['blacklisted'] }}</span>
                        @else
                            <span class="badge bg-green-100 text-green-700">{{ $t['active'] }}</span>
                        @endif
                    </td>
                    <td class="table-td text-gray-500 text-xs">
                        {{ $user->created_at ? $user->created_at->format('d M Y') : '—' }}
                    </td>
                    <td class="table-td">
                        <div class="flex gap-1">
                            @if($user->verification_status === 'pending')
                                <form method="POST" action="{{ route('admin.users.verify', $user->id) }}" class="inline">
                                    @csrf
                                    <input type="hidden" name="approved" value="1">
                                    <button type="submit" title="{{ $t['verified'] }}"
                                        class="p-1 text-green-600 hover:bg-green-50 rounded" onclick="return confirm('Verify this user?')">
                                        <i data-lucide="check-circle" class="w-4 h-4"></i>
                                    </button>
                                </form>
                                <form method="POST" action="{{ route('admin.users.verify', $user->id) }}" class="inline">
                                    @csrf
                                    <input type="hidden" name="approved" value="0">
                                    <button type="submit" title="{{ $t['rejected'] }}"
                                        class="p-1 text-red-600 hover:bg-red-50 rounded" onclick="return confirm('Reject this user?')">
                                        <i data-lucide="x-circle" class="w-4 h-4"></i>
                                    </button>
                                </form>
                            @endif
                            <form method="POST" action="{{ route('admin.users.blacklist', $user->id) }}" class="inline">
                                @csrf
                                <input type="hidden" name="blacklist" value="{{ $user->is_blacklisted ? '0' : '1' }}">
                                <input type="hidden" name="reason" value="Admin action">
                                <button type="submit"
                                    title="{{ $user->is_blacklisted ? $t['active'] : $t['blacklisted'] }}"
                                    class="p-1 rounded {{ $user->is_blacklisted ? 'text-green-600 hover:bg-green-50' : 'text-red-600 hover:bg-red-50' }}"
                                    onclick="return confirm('{{ $user->is_blacklisted ? 'Unblock' : 'Block' }} this user?')">
                                    <i data-lucide="ban" class="w-4 h-4"></i>
                                </button>
                            </form>
                        </div>
                    </td>
                </tr>
                @empty
                <tr>
                    <td colspan="7" class="text-center py-8 text-gray-400">{{ $t['noUsersFound'] }}</td>
                </tr>
                @endforelse
            </tbody>
        </table>
    </div>

    <div class="mt-4">{{ $users->links() }}</div>

</div>

<!-- Create Agent Modal -->
<div id="createAgentModal" class="hidden fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
        <h3 class="text-lg font-bold text-gray-900 mb-4">{{ $t['createNewAgent'] }}</h3>

        <form method="POST" action="{{ route('admin.users.create-agent') }}">
            @csrf

            <div class="mb-4">
                <label class="form-label">{{ $t['fullName'] }}</label>
                <input type="text" name="name" required placeholder="{{ $t['enterAgentName'] }}" class="form-input">
            </div>

            <div class="mb-4">
                <label class="form-label">{{ $t['mobileNumber'] }}</label>
                <input type="text" name="phone" required placeholder="{{ $t['tenDigit'] }}" maxlength="10" class="form-input">
            </div>

            <div class="mb-6">
                <label class="form-label">{{ $t['password'] }}</label>
                <input type="password" name="password" required placeholder="{{ $t['minChars'] }}" minlength="6" class="form-input">
            </div>

            <div class="flex justify-end gap-3">
                <button type="button"
                    onclick="document.getElementById('createAgentModal').classList.add('hidden')"
                    class="btn-secondary">{{ $t['cancel'] }}</button>
                <button type="submit" class="btn-primary">{{ $t['createAgent'] }}</button>
            </div>
        </form>
    </div>
</div>
@endsection
