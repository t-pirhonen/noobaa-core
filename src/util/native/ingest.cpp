#include "ingest.h"
#include "buf.h"
#include "ssl.h"

// statics

v8::Persistent<v8::Function> Ingest_v1::_ctor;

Ingest_v1::Hasher::Config
Ingest_v1::_hasher_conf(
    0x9u,   /* poly */
    31u,    /* degree */
    128u    /* window_len */
    );

Ingest_v1::Deduper::Config
Ingest_v1::_deduper_conf(
    3u*128*1024,    /* min_chunk */
    6u*128*1024,    /* max_chunk */
    18u,            /* avg_chunk_bits */
    0x07071070u     /* avg_chunk_val */
    );

void
Ingest_v1::setup(v8::Handle<v8::Object> exports)
{
    auto name = "Ingest_v1";
    auto tpl(NanNew<v8::FunctionTemplate>(Ingest_v1::new_instance));
    tpl->SetClassName(NanNew(name));
    tpl->InstanceTemplate()->SetInternalFieldCount(1);
    NODE_SET_PROTOTYPE_METHOD(tpl, "push", Ingest_v1::push);
    NODE_SET_PROTOTYPE_METHOD(tpl, "flush", Ingest_v1::flush);
    NanAssignPersistent(_ctor, tpl->GetFunction());
    exports->Set(NanNew(name), _ctor);
}

NAN_METHOD(Ingest_v1::new_instance)
{
    NanScope();
    if (args.IsConstructCall()) {
        if (!args[0]->IsFunction()) {
            return NanThrowError("expected function as first argument");
        }
        NanCallbackRef callback(new NanCallback(args[0].As<v8::Function>()));
        Ingest_v1* obj = new Ingest_v1(callback);
        obj->Wrap(args.This());
        NanReturnValue(args.This());
    } else {
        // Invoked as plain function `Ingest_v1(...)`, turn into construct call.
        const int argc = 1;
        v8::Local<v8::Value> argv[argc] = { args[0] };
        NanReturnValue(_ctor->NewInstance(argc, argv));
    }
}

NAN_METHOD(Ingest_v1::push)
{
    NanScope();
    auto self = Unwrap<Ingest_v1>(args.This());

    if (args.Length() < 1 || !node::Buffer::HasInstance(args[0])) {
        return NanThrowError("expected buffer as first argument");
    }

    Buf buf(args[0]);
    // std::cout << "Ingest_v1::push start " << std::dec << buf.length() << std::endl;
    self->_deduper.push(buf);
    // std::cout << "Ingest_v1::push pushed " << std::dec << buf.length() << std::endl;
    self->purge_chunks();
    NanReturnUndefined();
}

NAN_METHOD(Ingest_v1::flush)
{
    NanScope();
    auto self = Unwrap<Ingest_v1>(args.This());
    // std::cout << "Ingest_v1::flush start" << std::endl;
    self->_deduper.flush();
    // std::cout << "Ingest_v1::flush flushed" << std::endl;
    self->purge_chunks();
    NanReturnUndefined();
}

void
Ingest_v1::purge_chunks()
{
    while (_deduper.has_chunks()) {
        Buf chunk(_deduper.pop_chunk());
        Digest digest;
        digest.sha256(chunk);
        std::string sha256 = digest.to_string();
        v8::Handle<v8::Value> argv[] = { chunk.handle(), NanNew(sha256) };
        _callback->Call(2, argv);
    }
}
