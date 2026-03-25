<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use Illuminate\Http\Request;

class CompanyController extends Controller
{
    public function index()
    {
        $user = auth()->user();
        if ($user->role === 'recruiter') {
            return response()->json(Company::where('company_id', $user->company_id)->paginate());
        }
        return response()->json(Company::paginate());
    }

    public function show($id)
    {
        $user = auth()->user();
        if ($user->role === 'recruiter' && (int) $id !== (int) $user->company_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        return response()->json(Company::findOrFail($id));
    }

    public function store(Request $request)
    {
        $user = auth()->user();
        if ($user->role !== 'admin') {
            return response()->json(['message' => 'Only admin can create company'], 403);
        }

        $data = $request->validate([
            'name' => 'required|string', 'website' => 'nullable|url', 'postal_address' => 'nullable|string',
            'employee_count' => 'nullable|integer', 'sector' => 'nullable|string', 'allow_nirf_sharing' => 'boolean'
        ]);
        return response()->json(Company::create($data), 201);
    }

    public function update(Request $request, $id)
    {
        $user = auth()->user();
        if ($user->role === 'recruiter' && (int) $id !== (int) $user->company_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $company = Company::findOrFail($id);
        $company->update($request->all());
        return response()->json($company);
    }

    public function destroy($id)
    {
        $user = auth()->user();
        if ($user->role !== 'admin') {
            return response()->json(['message' => 'Only admin can delete company'], 403);
        }

        Company::findOrFail($id)->delete();
        return response()->json(['message' => 'Deleted']);
    }
}
