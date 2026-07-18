import Avatar from "boring-avatars";
import { Button } from "@/components/ui/button";

import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { useSession } from "@/lib/auth-client";
import DeleteAccountButton from "./deleteAccountButton";
import SignOutButton from "./signOutButton";

export function PopoverDemo() {
	return (
		<Popover>
			<PopoverTrigger
				render={<Button variant="outline">Open popover</Button>}
			/>
			<PopoverContent className="w-80"></PopoverContent>
		</Popover>
	);
}

const UserBubble = () => {
	const { data: session } = useSession();

	return (
		<>
			{session !== null && (
				<Popover>
					<PopoverTrigger
						render={
							<Button
								variant="outline"
								className="w-fit p-1 h-fit justify-start"
							>
								<AvatarName name={session.user.name} />
							</Button>
						}
					/>
					<PopoverContent className="w-fit" align="start">
						<AvatarName name={session.user.name} />
						<p className="text-gray-500">{session?.user.email}</p>
						<div className="flex flex-row justify-between items-center gap-2">
							<SignOutButton />
							<DeleteAccountButton withConfirmation />
						</div>
					</PopoverContent>
				</Popover>
			)}
		</>
	);
};

function AvatarName({ name }: { name: string }) {
	return (
		<div className="flex flex-row gap-2 items-center">
			<Avatar name={name} />
			<p>{name}</p>
		</div>
	);
}

export default UserBubble;
