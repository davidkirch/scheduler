import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "./ui/alert-dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

const DeteleAccountButton = ({
	withConfirmation = false,
}: {
	withConfirmation?: boolean;
}) => {
	const [confirmationOpen, setConfirmationOpen] = useState(false);

	const { data: session } = authClient.useSession();
	const isAnonymous = session?.user.isAnonymous === true;

	async function handleDelete() {
		if (isAnonymous) {
			await authClient.deleteAnonymousUser();
		} else {
			await authClient.deleteUser();
		}
		setConfirmationOpen(false);
		window.location.href = "/";
	}

	return (
		<>
			<Button
				variant="destructive"
				onClick={() => {
					if (withConfirmation) {
						setConfirmationOpen(true);
					} else {
						handleDelete();
					}
				}}
			>
				delete account
			</Button>
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
		<AlertDialog
			open={open}
			onOpenChange={(next) => {
				setOpen(next);
				setTyped(""); // never leave a live confirmation behind for the next open
			}}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>delete your account?</AlertDialogTitle>
					<AlertDialogDescription>
						this cannot be undone. your account, every project you own, and all
						the votes people cast on them will be deleted. votes you cast on
						other people's projects go too.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<div className="flex flex-col gap-2 text-sm">
					<Label>
						type <span className="font-mono font-bold">{CONFIRM_WORD}</span> to
						confirm
					</Label>
					<Input
						value={typed}
						onChange={(e) => setTyped(e.target.value)}
						autoComplete="off"
					/>
				</div>
				<AlertDialogFooter>
					<AlertDialogCancel>cancel</AlertDialogCancel>
					<AlertDialogAction
						variant="destructive"
						disabled={typed !== CONFIRM_WORD}
						onClick={(e) => {
							e.preventDefault();
							handleDelete();
						}}
					>
						delete
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

export default DeteleAccountButton;
