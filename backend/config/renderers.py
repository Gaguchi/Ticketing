"""
Custom JSON renderer that properly handles Unicode characters.
This ensures Georgian, Arabic, Chinese and other non-ASCII characters
are rendered correctly without escaping to unicode escape sequences.
"""
import json
from rest_framework.renderers import JSONRenderer


class UnicodeJSONRenderer(JSONRenderer):
    """
    JSON renderer that doesn't escape non-ASCII characters.
    """
    charset = 'utf-8'
    ensure_ascii = False
    
    def render(self, data, accepted_media_type=None, renderer_context=None):
        """
        Render `data` into JSON with proper Unicode support.
        """
        if data is None:
            return b''

        renderer_context = renderer_context or {}
        indent = self.get_indent(accepted_media_type, renderer_context)

        # Use compact separators when no indent
        if indent is None:
            separators = (',', ':')
        else:
            separators = None

        ret = json.dumps(
            data,
            cls=self.encoder_class,
            indent=indent,
            ensure_ascii=self.ensure_ascii,
            allow_nan=not self.strict,
            separators=separators,
        )

        # Escape line/paragraph separators for strict JavaScript subset
        ret = ret.replace('\u2028', r'\u2028').replace('\u2029', r'\u2029')
        return ret.encode(self.charset)
