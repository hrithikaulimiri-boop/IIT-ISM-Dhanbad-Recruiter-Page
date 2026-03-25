<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CompanyDocument;
use App\Models\JobDocument;
use App\Models\JobProfile;
use App\Models\Salary;
use App\Models\SalaryDocument;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class DocumentController extends Controller
{
    private function recruiterOwnsCompany(int $companyId): bool
    {
        $user = auth()->user();
        return $user->role === 'admin' || (int) $user->company_id === $companyId;
    }

    private function recruiterOwnsJob(int $jobId): bool
    {
        $user = auth()->user();
        if ($user->role === 'admin') return true;
        return JobProfile::where('job_id', $jobId)->where('company_id', $user->company_id)->exists();
    }

    private function recruiterOwnsSalary(int $salaryId): bool
    {
        $user = auth()->user();
        if ($user->role === 'admin') return true;
        $salary = Salary::find($salaryId);
        if (!$salary) return false;
        return JobProfile::where('job_id', $salary->job_id)->where('company_id', $user->company_id)->exists();
    }

    public function uploadCompanyDocument(Request $request, $company)
    {
        if (!$this->recruiterOwnsCompany((int) $company)) return response()->json(['message' => 'Forbidden'], 403);

        $request->validate(['file' => 'required|file|max:2048']);
        $file = $request->file('file');
        $path = $file->store('company_documents', 'public');
        return response()->json(CompanyDocument::create([
            'company_id' => $company,
            'file_name' => $file->getClientOriginalName(),
            'file_path' => $path,
            'mime_type' => $file->getClientMimeType(),
            'size' => $file->getSize(),
        ]), 201);
    }

    public function uploadJobDocument(Request $request, $job)
    {
        if (!$this->recruiterOwnsJob((int) $job)) return response()->json(['message' => 'Forbidden'], 403);

        $request->validate(['file' => 'required|file|max:2048']);
        $file = $request->file('file');
        $path = $file->store('job_documents', 'public');
        return response()->json(JobDocument::create([
            'job_id' => $job,
            'file_name' => $file->getClientOriginalName(),
            'file_path' => $path,
            'mime_type' => $file->getClientMimeType(),
            'size' => $file->getSize(),
        ]), 201);
    }

    public function uploadSalaryDocument(Request $request, $salary)
    {
        if (!$this->recruiterOwnsSalary((int) $salary)) return response()->json(['message' => 'Forbidden'], 403);

        $request->validate(['file' => 'required|file|max:2048']);
        $file = $request->file('file');
        $path = $file->store('salary_documents', 'public');
        return response()->json(SalaryDocument::create([
            'salary_id' => $salary,
            'file_name' => $file->getClientOriginalName(),
            'file_path' => $path,
            'mime_type' => $file->getClientMimeType(),
            'size' => $file->getSize(),
        ]), 201);
    }

    public function listCompanyDocuments($company)
    {
        if (!$this->recruiterOwnsCompany((int) $company)) return response()->json(['message' => 'Forbidden'], 403);
        return response()->json(['data' => CompanyDocument::where('company_id', $company)->latest()->get()]);
    }

    public function listJobDocuments($job)
    {
        if (!$this->recruiterOwnsJob((int) $job)) return response()->json(['message' => 'Forbidden'], 403);
        return response()->json(['data' => JobDocument::where('job_id', $job)->latest()->get()]);
    }

    public function listSalaryDocuments($salary)
    {
        if (!$this->recruiterOwnsSalary((int) $salary)) return response()->json(['message' => 'Forbidden'], 403);
        return response()->json(['data' => SalaryDocument::where('salary_id', $salary)->latest()->get()]);
    }

    public function deleteCompanyDocument($id)
    {
        $doc = CompanyDocument::findOrFail($id);
        if (!$this->recruiterOwnsCompany((int) $doc->company_id)) return response()->json(['message' => 'Forbidden'], 403);

        Storage::disk('public')->delete($doc->file_path);
        $doc->delete();
        return response()->json(['message' => 'Company document deleted']);
    }

    public function deleteJobDocument($id)
    {
        $doc = JobDocument::findOrFail($id);
        if (!$this->recruiterOwnsJob((int) $doc->job_id)) return response()->json(['message' => 'Forbidden'], 403);

        Storage::disk('public')->delete($doc->file_path);
        $doc->delete();
        return response()->json(['message' => 'Job document deleted']);
    }

    public function deleteSalaryDocument($id)
    {
        $doc = SalaryDocument::findOrFail($id);
        if (!$this->recruiterOwnsSalary((int) $doc->salary_id)) return response()->json(['message' => 'Forbidden'], 403);

        Storage::disk('public')->delete($doc->file_path);
        $doc->delete();
        return response()->json(['message' => 'Salary document deleted']);
    }
}
