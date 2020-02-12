# VISTA Client
NodeJS RPC Client library with Promise-based API

## Background
We developed a standard test harness during early the VDP / VAM project to run scriptable tests against a VISTA system via the RPC broker.
This worked, but there was room for improvement. This new library adds new features to address the shortcomings of the original client library.

## Features
* Promise-based API: The original library was callback-based, which made for some unwieldy code. Using `async/await` along with the 
Promise-based API greatly streamlines the look and feel of the code
* Configure => Run: The original library was reactive: you sent as you went. The new library forces you to configure the RPCs to send up front,
then use the API to batch-send the RPCs. This means that loading a scripted RPC sequence from a JSON file is way easier to do.
* Templated Arguments: The VISTA client maintains a run-time context object that can be used to set templated variables in the 
argument definitions. 
* Runtime RPC Options:
   - **Repeat**: RPCs can be repeated for a given number of times. Makes for cleaner code
   - **Encrypt**: The VISTA Client can encrypt string arguments using the standard VISTA cipher.
   - **Context Setting**: RPC responses can be stored in the VISTA Client run time context! This, combined with argument templating, gives
   you a pretty powerful mechanism to create dynamic RPC sequences that depend on runtime results (e.g. IEN from the response of one
   RPC call can be used in subsequent RPC calls by capturing the response, then templating the following requests)
* Socket management: The VISTA Client will manage the TCP socket connection for you!
* Result management: The VISTA Client will store and format the runtime and ancillary data associated with each RPC request and response.

## API
API documentation is forthcoming, but for now, check out the code in the `examples` directory
