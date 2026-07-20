import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import DeleteAccountButton from "./deleteAccountButton";
import LoginSignUp from "./logInSignUp";
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "./ui/alert-dialog";
import { Button } from "./ui/button";

const SignOutButton = () => {
	const { data: session } = authClient.useSession();
	const isAnonymous = session?.user.isAnonymous === true;

	const [claimOpen, setClaimOpen] = useState(false);

	async function handleSignOut() {
		if (isAnonymous) {
			setClaimOpen(true);
			return;
		}
		try {
			await authClient.signOut();
		} catch (err) {
			toast.error(
				err instanceof Error
					? `could not sign out: ${err.message}`
					: "could not sign out",
				{ position: "top-center" },
			);
		}
	}
	return (
		<>
			<Button onClick={handleSignOut}>sign out</Button>
			<ClaimDialog open={claimOpen} setOpen={setClaimOpen} />
		</>
	);
};

function ClaimDialog({
	open,
	setOpen,
}: {
	open: boolean;
	setOpen: (state: boolean) => void;
}) {
	return (
		<AlertDialog open={open} onOpenChange={setOpen}>
			<AlertDialogContent>
				<AlertDialogHeader className="flex flex-col gap-4 w-fit">
					<div>
						<AlertDialogTitle>claim your account!</AlertDialogTitle>
						<AlertDialogDescription>
							if you log out of an anonymous session your account will be lost.
							claim it now!
						</AlertDialogDescription>
					</div>
					<LoginSignUp offerSignUp />
				</AlertDialogHeader>
				<AlertDialogFooter>
					<div className="flex flex-row justify-between w-full">
						<DeleteAccountButton withConfirmation />
						<Button variant="outline" onClick={() => setOpen(false)}>
							cancel
						</Button>
					</div>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

export default SignOutButton;
