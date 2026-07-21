import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { useToast } from "@astryxdesign/core/Toast";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import DeleteAccountButton from "./deleteAccountButton";
import LoginSignUp from "./logInSignUp";

const SignOutButton = () => {
	const { data: session } = authClient.useSession();
	const isAnonymous = session?.user.isAnonymous === true;
	const showToast = useToast();

	const [claimOpen, setClaimOpen] = useState(false);

	async function handleSignOut() {
		if (isAnonymous) {
			setClaimOpen(true);
			return;
		}
		try {
			await authClient.signOut();
		} catch (err) {
			showToast({
				body:
					err instanceof Error
						? `could not sign out: ${err.message}`
						: "could not sign out",
				type: "error",
			});
		}
	}
	return (
		<>
			<Button label="sign out" variant="primary" onClick={handleSignOut} />
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
		<Dialog isOpen={open} onOpenChange={setOpen} purpose="form" width={400}>
			<div className="flex flex-col gap-4">
				<DialogHeader
					title="claim your account!"
					subtitle="if you log out of an anonymous session your account will be lost. claim it now!"
					onOpenChange={setOpen}
				/>
				<div className="flex flex-col gap-4 w-fit">
					<LoginSignUp offerSignUp />
				</div>
				<div className="flex flex-row justify-between w-full">
					<DeleteAccountButton withConfirmation />
					<Button
						label="cancel"
						variant="secondary"
						onClick={() => setOpen(false)}
					/>
				</div>
			</div>
		</Dialog>
	);
}

export default SignOutButton;
