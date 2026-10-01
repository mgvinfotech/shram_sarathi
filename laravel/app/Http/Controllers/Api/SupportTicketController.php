<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SupportTicket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SupportTicketController extends Controller
{
    /**
     * GET /api/support/tickets
     * List support tickets created by the authenticated user.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $tickets = SupportTicket::where('user_id', $user->id)
            ->with('booking')
            ->orderByDesc('created_at')
            ->paginate(20);

        return response()->json([
            'success' => true,
            'data'    => $tickets->items(),
            'meta'    => [
                'current_page' => $tickets->currentPage(),
                'last_page'    => $tickets->lastPage(),
                'total'        => $tickets->total(),
            ],
        ]);
    }

    /**
     * POST /api/support/tickets
     * Create a new support ticket / SOS report.
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'subject'     => 'required|string|max:255',
            'description' => 'required|string|max:2000',
            'priority'    => 'sometimes|string|in:low,normal,high,urgent',
            'booking_id'  => 'sometimes|nullable|integer|exists:bookings,id',
            'is_sos'      => 'sometimes|boolean',
        ]);

        $priority = $data['priority'] ?? (!empty($data['is_sos']) ? 'urgent' : 'normal');
        $subject  = (!empty($data['is_sos']) ? '[SOS] ' : '') . $data['subject'];

        $ticket = SupportTicket::create([
            'user_id'     => $user->id,
            'booking_id'  => $data['booking_id'] ?? null,
            'subject'     => $subject,
            'description' => $data['description'],
            'priority'    => $priority,
            'status'      => 'open',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'टिकट सफलतापूर्वक दर्ज कर लिया गया है। सहायता टीम जल्द संपर्क करेगी।',
            'data'    => $ticket,
        ], 201);
    }
}
