import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { TextInput } from "@astryxdesign/core/TextInput";
import { useToast } from "@astryxdesign/core/Toast";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

const DeteleAccountButton = ({
	withConfirmation = false,
}: {
	withConfirmation?: boolean;
}) => {
	const [confirmationOpen, setConfirmationOpen] = useState(false);
	const showToast = useToast();

	const { data: session } = authClient.useSession();
	const isAnonymous = session?.user.isAnonymous === true;

	async function handleDelete() {
		try {
			if (isAnonymous) {
				await authClient.deleteAnonymousUser();
			} else {
				await authClient.deleteUser();
			}
		} catch (err) {
			// Never redirect on failure — that told the user their data was gone
			// while it was still in the database.
			showToast({
				body:
					err instanceof Error
						? `could not delete account: ${err.message}`
						: "could not delete account",
				type: "error",
			});
			return;
		}
		setConfirmationOpen(false);
		window.location.href = "/";
	}

	return (
		<>
			<Button
				label="delete account"
				variant="destructive"
				onClick={() => {
					if (withConfirmation) {
						setConfirmationOpen(true);
					} else {
						handleDelete();
					}
				}}
			/>
			<ConfirmationDialog
				open={confirmationOpen}
				setOpen={setConfirmationOpen}
				handleDelete={handleDelete}
			/>
		</>
	);
};

const CONFIRM_WORD = "delete";

function ConfirmationDialog({
	open,
	setOpen,
	handleDelete,
}: {
	open: boolean;
	setOpen: (state: boolean) => void;
	handleDelete: () => void;
}) {
	const [typed, setTyped] = useState("");
	return (
		<Dialog
			isOpen={open}
			onOpenChange={(next) => {
				setOpen(next);
				setTyped(""); // never leave a live confirmation behind for the next open
			}}
			purpose="form"
			width={400}
		>
			<div className="flex flex-col gap-4">
				<DialogHeader
					title="delete your account?"
					subtitle="this cannot be undone. your account, every project you own, and all the votes people cast on them will be deleted. votes you cast on other people's projects go too."
					onOpenChange={setOpen}
				/>
				<TextInput
					label={`type ${CONFIRM_WORD} to confirm`}
					value={typed}
					onChange={setTyped}
				/>
				<div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
					<Button
						label="cancel"
						variant="secondary"
						onClick={() => setOpen(false)}
					/>
					<Button
						label="delete"
						variant="destructive"
						isDisabled={typed !== CONFIRM_WORD}
						onClick={(e) => {
							e.preventDefault();
							handleDelete();
						}}
					/>
				</div>
			</div>
		</Dialog>
	);
}

export default DeteleAccountButton;
