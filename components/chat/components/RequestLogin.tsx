import { SignInButton } from "@clerk/nextjs";

export function RequestLogin() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-gray-50 p-6 text-center">
          <p className="text-sm text-gray-500">
            Sign in to chat with the portfolio assistant.
          </p>
          <SignInButton mode="modal">
            <button
              type="button"
              className="rounded-lg bg-black px-4 py-2 text-sm text-white transition-colors hover:bg-gray-800"
            >
              Sign in
            </button>
          </SignInButton>
        </div>
  );
}