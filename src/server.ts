import {
	createStartHandler,
	defaultStreamHandler,
} from "@tanstack/react-start/server";

// Imported for its side effect: validates env and crashes the process on boot
// if anything required is missing, instead of failing on the first request.
import "./env";

export default {
	fetch: createStartHandler(defaultStreamHandler),
};
