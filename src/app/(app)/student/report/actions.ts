"use server"

// This file creates the server-action boundary. Client components can safely
// import from here; Next.js serialises the call over the network and runs the
// function on the server. today.ts (which uses next/headers / next/cache) never
// enters the client bundle.

import {
  submitReport as _submitReport,
} from "@/lib/progression/today"
import type { SubmitReportInput } from "@/lib/progression/today"

export async function submitReport(input: SubmitReportInput) {
  return _submitReport(input)
}
