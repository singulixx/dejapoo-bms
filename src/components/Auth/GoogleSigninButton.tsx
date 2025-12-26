import { GoogleIcon } from "@/assets/icons";

export default function GoogleSigninButton({ text }: { text: string }) {
  return (
    <button className="flex w-full items-center justify-center gap-3 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-white shadow-sm hover:bg-primary/90">
      <GoogleIcon />
      {text} with Google
    </button>
  );
}
