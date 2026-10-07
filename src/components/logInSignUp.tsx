import { Heading, Text } from "@astryxdesign/core";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Divider } from "@astryxdesign/core/Divider";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { TextInput } from "@astryxdesign/core/TextInput";
import { useState } from "react";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";

const anonymousSchema = z.object({
	name: z.string().min(1, "Name is required."),
});

const signInSchema = z.object({
	email: z.email("That doesn't look like an email."),
	password: z.string().min(1, "Password is required."),
});

const signUpSchema = signInSchema.extend({
	name: z.string().min(1, "Name is required."),
	password: z.string().min(8, "Password must be at least 8 characters."),
});

const LoginSignUp = ({
	offerAnonymous = false,
	offerSignIn = false,
	offerSignUp = false,
	asCard = false,
	showTitle = false,
	successAction,
}: {
	offerAnonymous?: boolean;
	offerSignIn?: boolean;
	offerSignUp?: boolean;
	asCard?: boolean;
	showTitle?: boolean;
	successAction?: () => void;
}) => {
	const [error, setError] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState(
		offerAnonymous ? "anonymous" : offerSignIn ? "log in" : "sign up",
	);
	const [anonymousName, setAnonymousName] = useState("");
	const [signInEmail, setSignInEmail] = useState("");
	const [signInPassword, setSignInPassword] = useState("");
	const [signUpName, setSignUpName] = useState("");
	const [signUpEmail, setSignUpEmail] = useState("");
	const [signUpPassword, setSignUpPassword] = useState("");

	const content = (
		<div className="flex flex-col gap-4 w-full">
			{showTitle === true && <Heading level={3}>log in or sign up</Heading>}
			<div className="flex flex-col gap-2">
				<TabList value={activeTab} onChange={setActiveTab} layout="fill">
					{offerAnonymous && <Tab value="anonymous" label="anonymous" />}
					{offerSignIn && <Tab value="log in" label="log in" />}
					{offerSignUp && <Tab value="sign up" label="sign up" />}
				</TabList>
				{error && (
					<Text role="alert" size="sm" className="text-destructive">
						{error}
					</Text>
				)}
				{offerAnonymous && activeTab === "anonymous" && (
					<form
						noValidate
						onSubmit={async (e) => {
							e.preventDefault();
							setError(null);
							try {
								const { name } = anonymousSchema.parse({
									name: anonymousName,
								});
								await authClient.signIn.anonymous();
								await authClient.updateUser({ name });
								successAction?.();
							} catch (err) {
								setError(
									err instanceof Error ? err.message : "Something went wrong.",
								);
							}
						}}
					>
						<div className="flex flex-col gap-4">
							<TextInput
								label="name"
								value={anonymousName}
								onChange={setAnonymousName}
								isRequired
							/>
							<Button
								type="submit"
								label="log in anonymous"
								variant="primary"
							/>
						</div>
					</form>
				)}
				{offerSignIn && activeTab === "log in" && (
					<form
						noValidate
						onSubmit={async (e) => {
							e.preventDefault();
							setError(null);
							try {
								const { email, password } = signInSchema.parse({
									email: signInEmail,
									password: signInPassword,
								});
								await authClient.signIn.email({
									email: email,
									password: password,
								});
								successAction?.();
							} catch (err) {
								setError(
									err instanceof Error ? err.message : "Something went wrong.",
								);
							}
						}}
					>
						<div className="flex flex-col gap-4">
							<TextInput
								label="email"
								type="email"
								value={signInEmail}
								onChange={setSignInEmail}
								isRequired
							/>
							<TextInput
								label="password"
								type="password"
								value={signInPassword}
								onChange={setSignInPassword}
								isRequired
							/>
							<Button type="submit" label="log in" variant="primary" />
							<Divider />
							<Button
								type="button"
								onClick={async () => {
									setError(null);
									try {
										await authClient.signIn.social({ provider: "github" });
										successAction?.();
									} catch (err) {
										setError(
											err instanceof Error
												? err.message
												: "Something went wrong.",
										);
									}
								}}
								className="w-full"
								label="sign in with github"
								variant="primary"
							/>
						</div>
					</form>
				)}
				{offerSignUp && activeTab === "sign up" && (
					<form
						noValidate
						onSubmit={async (e) => {
							e.preventDefault();
							setError(null);
							try {
								const { name, email, password } = signUpSchema.parse({
									name: signUpName,
									email: signUpEmail,
									password: signUpPassword,
								});
								await authClient.signUp.email({
									email: email,
									password: password,
									name: name,
								});
								successAction?.();
							} catch (err) {
								setError(
									err instanceof Error ? err.message : "Something went wrong.",
								);
							}
						}}
					>
						<div className="flex flex-col gap-4">
							<TextInput
								label="name"
								value={signUpName}
								onChange={setSignUpName}
								isRequired
							/>
							<TextInput
								label="email"
								type="email"
								value={signUpEmail}
								onChange={setSignUpEmail}
								isRequired
							/>
							<TextInput
								label="password"
								type="password"
								value={signUpPassword}
								onChange={setSignUpPassword}
								isRequired
							/>
							<Button type="submit" label="sign up" variant="primary" />
							<Divider />
							<Button
								type="button"
								onClick={async () => {
									setError(null);
									try {
										await authClient.signIn.social({ provider: "github" });
										successAction?.();
									} catch (err) {
										setError(
											err instanceof Error
												? err.message
												: "Something went wrong.",
										);
									}
								}}
								className="w-full"
								label="sign up with github"
								variant="primary"
							/>
						</div>
					</form>
				)}
			</div>
		</div>
	);

	return asCard ? (
		<Card className="w-full max-w-sm h-fit" padding={4}>
			{content}
		</Card>
	) : (
		content
	);
};

export default LoginSignUp;
