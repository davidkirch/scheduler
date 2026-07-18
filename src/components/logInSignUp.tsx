import { useState } from "react";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Separator } from "./ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

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

const parseForm = <T,>(schema: z.ZodType<T>, form: HTMLFormElement): T => {
	const result = schema.safeParse(Object.fromEntries(new FormData(form)));
	if (!result.success) throw new Error(result.error.issues[0].message);
	return result.data;
};

const LoginSignUp = ({
	offerAnonymous = false,
	offerSignIn = false,
	offerSignUp = false,
}: {
	offerAnonymous?: boolean;
	offerSignIn?: boolean;
	offerSignUp?: boolean;
}) => {
	const [error, setError] = useState<string | null>(null);
	return (
		<div className="w-full">
			<Tabs>
				<TabsList className="w-full">
					{offerAnonymous && (
						<TabsTrigger value="anonymous">anonymous</TabsTrigger>
					)}
					{offerSignIn && <TabsTrigger value="log in">log in</TabsTrigger>}
					{offerSignUp && <TabsTrigger value="sign up">sign up</TabsTrigger>}
				</TabsList>
				{error && (
					<p role="alert" className="text-sm text-destructive">
						{error}
					</p>
				)}
				{offerAnonymous && (
					<TabsContent value="anonymous">
						<form
							noValidate
							onSubmit={async (e) => {
								e.preventDefault();
								setError(null);
								try {
									const { name } = parseForm(anonymousSchema, e.currentTarget);
									await authClient.signIn.anonymous();
									await authClient.updateUser({ name });
								} catch (err) {
									setError(
										err instanceof Error
											? err.message
											: "Something went wrong.",
									);
								}
							}}
						>
							<p>name</p>
							<Input name="name" type="text" required />
							<Button type="submit">log in anonymous</Button>
						</form>
					</TabsContent>
				)}
				{offerSignIn && (
					<TabsContent value="log in">
						<form
							noValidate
							onSubmit={async (e) => {
								e.preventDefault();
								setError(null);
								try {
									const { email, password } = parseForm(
										signInSchema,
										e.currentTarget,
									);
									await authClient.signIn.email({
										email: email,
										password: password,
									});
								} catch (err) {
									setError(
										err instanceof Error
											? err.message
											: "Something went wrong.",
									);
								}
							}}
						>
							<p>email</p>
							<Input name="email" type="email" required />
							<p>password</p>
							<Input name="password" type="password" required />
							<Button type="submit">log in</Button>
							<Separator className="mt-2 mb-2" />
							<Button
								type="button"
								onClick={async () =>
									await authClient.signIn.social({ provider: "github" })
								}
								className="w-full"
							>
								sign in with github
							</Button>
						</form>
					</TabsContent>
				)}
				{offerSignUp && (
					<TabsContent value="sign up">
						<form
							noValidate
							onSubmit={async (e) => {
								e.preventDefault();
								setError(null);
								try {
									const { name, email, password } = parseForm(
										signUpSchema,
										e.currentTarget,
									);
									await authClient.signUp.email({
										email: email,
										password: password,
										name: name,
									});
								} catch (err) {
									setError(
										err instanceof Error
											? err.message
											: "Something went wrong.",
									);
								}
							}}
						>
							<p>name</p>
							<Input name="name" type="text" required />
							<p>email</p>
							<Input name="email" type="email" required />
							<p>password</p>
							<Input name="password" type="password" required />
							<Button type="submit">sign up</Button>
							<Separator className="mt-2 mb-2" />
							<Button
								type="button"
								onClick={async () =>
									await authClient.signIn.social({ provider: "github" })
								}
								className="w-full"
							>
								sign in with github
							</Button>
						</form>
					</TabsContent>
				)}
			</Tabs>
		</div>
	);
};

export default LoginSignUp;
