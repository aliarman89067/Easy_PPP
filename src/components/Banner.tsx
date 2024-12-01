import { env } from "@/data/env/client";

export default function Banner({
  canRemoveBranding,
  message,
  mappings,
  customization,
}: {
  canRemoveBranding: boolean;
  message: string;
  mappings: { coupon: string; discount: string; country: string };
  customization: {
    backgroundColor: string;
    textColor: string;
    fontSize: string;
    isSticky: boolean;
    classPrefix?: string | null;
  };
}) {
  const prefix = customization.classPrefix ?? "";
  const mappedMessage = Object.entries(mappings).reduce(
    (mapMessage, [key, value]) => {
      return mapMessage.replace(new RegExp(`{${key}}`, "g"), value);
    },
    message.replace(/`/g, "&#39;")
  );
  return (
    <>
      <style type="text/css">
        {`
        .${prefix}easy-ppp-container {
            all: revert;
            display:flex;
            flex-direction: column;
            gap: .5em;
            background-color:${customization.backgroundColor};
            color:${customization.textColor};
            font-size:${customization.fontSize};
            font-family: inherit;
            padding: 1rem;
            ${customization.isSticky ? "position: sticky" : ""}
            left: 0;
            right: 0;
            top: 0;
            text-wrap: balance;
            text-align:center;
        }
        .${prefix}easy-ppp-branding {
            font-size: inherit;
            font-color: inherit;
            display: inline-block;
            text-decoration: underline;
        }
    `}
      </style>

      <div className={`${prefix}easy-ppp-container ${prefix}easy-ppp-override`}>
        <span
          className={`${prefix}easy-ppp-message ${prefix}easy-ppp-override`}
          dangerouslySetInnerHTML={{ __html: mappedMessage }}
        />
        {!canRemoveBranding && (
          <a
            href={`${env.NEXT_PUBLIC_SERVER_URL}`}
            className={`${prefix}easy-ppp-branding`}
          >
            Powered By Easy PPP
          </a>
        )}
      </div>
    </>
  );
}
