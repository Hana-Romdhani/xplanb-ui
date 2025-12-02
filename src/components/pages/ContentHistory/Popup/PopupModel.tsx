import React from "react";

interface PopupModelProps {
  title: string;
  bodyContent: React.ReactNode;
  onClose?: () => void;
  onSave?: () => void;
}
export default function PopupModel({
  title,
  bodyContent,
  onClose,
  onSave,
}: PopupModelProps) {
  const [showModal, setShowModal] = React.useState(false);

  return (
    <>
      <button
        className="bg-pink-500 text-white active:bg-pink-600 font-bold uppercase text-sm px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
        type="button"
        onClick={() => setShowModal(true)}>
        Open regular modal
      </button>
      {showModal ? (
        <>
          <div className="justify-center items-center flex overflow-x-hidden overflow-y-auto fixed inset-0 z-50 outline-none focus:outline-none">
            <div className="relative w-auto my-6 mx-auto max-w-3xl">
              <div className="border-0 rounded-lg shadow-lg relative flex flex-col w-full bg-white outline-none focus:outline-none">
                <div className="flex items-start justify-between p-5 border-b border-solid border-blueGray-200 rounded-t">
                  <h3 className="text-3xl font-semibold">{title}</h3>
                  <button
                    className="p-1 ml-auto bg-transparent border-0 text-black opacity-5 float-right text-3xl leading-none font-semibold outline-none focus:outline-none"
                    onClick={() => {
                      setShowModal(false);
                      onClose && onClose();
                    }}>
                    <span className="bg-transparent text-black opacity-5 h-6 w-6 text-2xl block outline-none focus:outline-none">
                      ×
                    </span>
                  </button>
                </div>
                <div className="relative p-6 flex-auto">
                  <p className="my-4 text-blueGray-500 text-lg leading-relaxed">
                    {bodyContent}
                  </p>
                </div>
                <div className="flex items-center justify-end p-6 border-t border-solid border-blueGray-200 rounded-b">
                  <button
                    className="text-red-500 background-transparent font-bold uppercase px-6 py-2 text-sm outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      onClose && onClose();
                    }}>
                    Close
                  </button>
                  <button
                    className="bg-emerald-500 text-white active:bg-emerald-600 font-bold uppercase text-sm px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      onSave && onSave();
                    }}>
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="opacity-25 fixed inset-0 z-40 bg-black"></div>
        </>
      ) : null}
    </>
    //   <Popover.Content style={{ width: 360 }}>
    //   <Grid columns="120px 1fr">
    //     <Inset side="left" pr="current">
    //       <img
    //         src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?&auto=format&fit=crop&w=400&q=80"
    //         style={{ objectFit: 'cover', width: '100%', height: '100%' }}
    //       />
    //     </Inset>

    //     <div>
    //       <Heading size="2" mb="1">
    //         Share this image
    //       </Heading>
    //       <Text as="p" size="2" mb="4" color="gray">
    //         Minimalistic 3D rendering wallpaper.
    //       </Text>

    //       <Flex direction="column" align="stretch">
    //         <Popover.Close>
    //           <Button size="1" variant="soft">
    //             <Link1Icon width="16" height="16" />
    //             Copy link
    //           </Button>
    //         </Popover.Close>
    //       </Flex>
    //     </div>
    //   </Grid>
    // </Popover.Content>
  );
}
